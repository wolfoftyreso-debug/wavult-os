// ─── Media Pipeline — Wavult OS ────────────────────────────────────────────────
// Hanterar: upload queue, processing pipeline, media inventory, storage stats

import { useState } from 'react'

// ─── Types ─────────────────────────────────────────────────────────────────────
type FileStatus = 'pending' | 'uploading' | 'processing' | 'done' | 'error'
type PipelineStage = 'UPLOAD' | 'GEO_EXTRACT' | 'AI_ANALYZE' | 'DELIVER' | 'ARCHIVE'

interface MediaFile {
  id: string
  name: string
  sizeMb: number
  missionId: string
  status: FileStatus
  progress: number
  lat?: number
  lng?: number
  aiTags?: string[]
  cdnUrl?: string
  uploadedAt: string
}

interface StorageBucket {
  id: string
  label: string
  region: string
  flag: string
  estimatedGb: number
  objectCount: number
  role: 'primary' | 'backup'
}

// ─── Mock data ─────────────────────────────────────────────────────────────────
const MOCK_FILES: MediaFile[] = [
  {
    id: 'f001', name: 'IMG_3821.jpg', sizeMb: 4.2, missionId: 'MIS-2024-001',
    status: 'done', progress: 100, lat: 59.3293, lng: 18.0686,
    aiTags: ['vehicle', 'road', 'urban', 'daytime'],
    cdnUrl: 'https://cdn.wavult.com/eu/f001.jpg', uploadedAt: '2026-03-28 09:12',
  },
  {
    id: 'f002', name: 'IMG_3822.jpg', sizeMb: 3.8, missionId: 'MIS-2024-001',
    status: 'done', progress: 100, lat: 59.3295, lng: 18.0689,
    aiTags: ['pedestrian', 'crosswalk', 'traffic-sign'],
    cdnUrl: 'https://cdn.wavult.com/eu/f002.jpg', uploadedAt: '2026-03-28 09:14',
  },
  {
    id: 'f003', name: 'IMG_3901.jpg', sizeMb: 5.1, missionId: 'MIS-2024-002',
    status: 'processing', progress: 65, lat: 59.3310, lng: 18.0701,
    uploadedAt: '2026-03-28 11:30',
  },
  {
    id: 'f004', name: 'IMG_3902.jpg', sizeMb: 4.7, missionId: 'MIS-2024-002',
    status: 'uploading', progress: 38, uploadedAt: '2026-03-28 11:31',
  },
  {
    id: 'f005', name: 'IMG_3903.jpg', sizeMb: 3.2, missionId: 'MIS-2024-002',
    status: 'pending', progress: 0, uploadedAt: '2026-03-28 11:32',
  },
  {
    id: 'f006', name: 'IMG_3750.jpg', sizeMb: 6.0, missionId: 'MIS-2024-003',
    status: 'error', progress: 0, uploadedAt: '2026-03-27 16:45',
  },
]

const PIPELINE_STAGES: { stage: PipelineStage; label: string; emoji: string; count: number; avgMs: number }[] = [
  { stage: 'UPLOAD',      label: 'Upload',      emoji: '📤', count: 2,  avgMs: 2400 },
  { stage: 'GEO_EXTRACT', label: 'Geo Extract', emoji: '📍', count: 1,  avgMs: 340  },
  { stage: 'AI_ANALYZE',  label: 'AI Analyze',  emoji: '🧠', count: 1,  avgMs: 1800 },
  { stage: 'DELIVER',     label: 'Deliver',     emoji: '🚀', count: 0,  avgMs: 120  },
  { stage: 'ARCHIVE',     label: 'Archive',     emoji: '🗄️', count: 2,  avgMs: 80   },
]

const STORAGE_BUCKETS: StorageBucket[] = [
  { id: 'eu-primary', label: 'EU Primary',    region: 'eu-north-1',  flag: '🇸🇪', estimatedGb: 12.4, objectCount: 3201, role: 'primary' },
  { id: 'eu-backup',  label: 'EU Backup',     region: 'eu-west-1',   flag: '🇮🇪', estimatedGb: 12.4, objectCount: 3201, role: 'backup'  },
  { id: 'us-primary', label: 'US Primary',    region: 'us-east-1',   flag: '🇺🇸', estimatedGb: 4.1,  objectCount: 1087, role: 'primary' },
  { id: 'us-backup',  label: 'US Backup',     region: 'us-west-2',   flag: '🇺🇸', estimatedGb: 4.1,  objectCount: 1087, role: 'backup'  },
]

// ─── Helpers ───────────────────────────────────────────────────────────────────
const STATUS_META: Record<FileStatus, { label: string; color: string; bg: string }> = {
  pending:    { label: 'Pending',    color: '#9CA3AF', bg: '#F9FAFB' },
  uploading:  { label: 'Uploading',  color: '#60A5FA', bg: '#1e3a5f' },
  processing: { label: 'Processing', color: '#FBBF24', bg: '#451a03' },
  done:       { label: 'Done',       color: '#34D399', bg: '#064e3b' },
  error:      { label: 'Error',      color: '#F87171', bg: '#450a0a' },
}

// ─── Component ─────────────────────────────────────────────────────────────────
export function MediaPipelineView() {
  const [filterStatus, setFilterStatus] = useState<FileStatus | 'all'>('all')
  const [filterMission, setFilterMission] = useState<string>('all')
  const [dragging, setDragging] = useState(false)

  const missions = [...new Set(MOCK_FILES.map(f => f.missionId))]
  const filtered = MOCK_FILES.filter(f =>
    (filterStatus === 'all' || f.status === filterStatus) &&
    (filterMission === 'all' || f.missionId === filterMission)
  )


  return (
    <div className="min-h-screen bg-white text-text-primary p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Media Pipeline</h1>
          <p className="text-gray-9000 text-sm mt-1">Upload · Geo-tagging · AI-analys · CDN-leverans · Arkiv</p>
        </div>
        <div className="flex gap-3 text-sm">
          <span className="bg-green-900/50 text-green-700 px-3 py-1 rounded-full border border-green-700">
            {MOCK_FILES.filter(f => f.status === 'done').length} levererade
          </span>
          <span className="bg-blue-900/50 text-blue-700 px-3 py-1 rounded-full border border-blue-700">
            {MOCK_FILES.filter(f => f.status === 'uploading' || f.status === 'processing').length} aktiva
          </span>
        </div>
      </div>

      {/* ── 1. Upload Queue ── */}
      <section>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span>📤</span> Upload Queue
        </h2>

        {/* Drag zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false) }}
          className={`border-2 border-dashed rounded-lg p-6 text-center mb-4 transition-colors cursor-pointer ${
            dragging ? 'border-blue-400 bg-blue-900/20' : 'border-gray-600 hover:border-gray-500'
          }`}
        >
          <p className="text-gray-9000">Dra och släpp bilder här, eller <span className="text-blue-700 underline cursor-pointer">välj filer</span></p>
          <p className="text-gray-9000 text-xs mt-1">Stöder: JPG, PNG, HEIC · Max 50 MB per fil</p>
        </div>

        {/* File list */}
        <div className="space-y-2">
          {MOCK_FILES.map(file => {
            const meta = STATUS_META[file.status]
            return (
              <div key={file.id} className="bg-muted/30 rounded-lg p-4 flex items-center gap-4">
                <div className="w-10 h-10 bg-muted rounded flex items-center justify-center text-lg flex-shrink-0">
                  🖼️
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm truncate">{file.name}</span>
                    <span className="text-xs text-gray-9000">{file.sizeMb} MB</span>
                    <span className="text-xs text-gray-9000">#{file.missionId}</span>
                  </div>
                  {file.lat && (
                    <div className="text-xs text-gray-9000">📍 {file.lat.toFixed(4)}, {file.lng?.toFixed(4)}</div>
                  )}
                  {(file.status === 'uploading' || file.status === 'processing') && (
                    <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: `${file.progress}%` }}
                      />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {(file.status === 'uploading' || file.status === 'processing') && (
                    <span className="text-xs text-gray-9000">{file.progress}%</span>
                  )}
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ color: meta.color, backgroundColor: meta.bg }}
                  >
                    {meta.label}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── 2. Processing Pipeline ── */}
      <section>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span>⚙️</span> Processing Pipeline
        </h2>
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {PIPELINE_STAGES.map((s, i) => (
            <>
              <div key={s.stage} className="bg-muted/30 rounded-xl p-4 text-center min-w-[120px] flex-shrink-0">
                <div className="text-2xl mb-1">{s.emoji}</div>
                <div className="text-xs font-semibold text-gray-800 mb-2">{s.label}</div>
                <div className="text-2xl font-bold text-blue-700">{s.count}</div>
                <div className="text-xs text-gray-9000 mt-1">filer</div>
                <div className="text-xs text-gray-9000 mt-1">~{s.avgMs < 1000 ? `${s.avgMs}ms` : `${(s.avgMs/1000).toFixed(1)}s`} snitt</div>
              </div>
              {i < PIPELINE_STAGES.length - 1 && (
                <div key={`arrow-${i}`} className="text-gray-9000 text-xl flex-shrink-0">→</div>
              )}
            </>
          ))}
        </div>
      </section>

      {/* ── 3. Media Inventory ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span>📁</span> Media Inventory
          </h2>
          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as FileStatus | 'all')}
              className="bg-muted/30 border border-surface-border text-gray-600 text-xs rounded px-2 py-1"
            >
              <option value="all">Alla statusar</option>
              {Object.entries(STATUS_META).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <select
              value={filterMission}
              onChange={e => setFilterMission(e.target.value)}
              className="bg-muted/30 border border-surface-border text-gray-600 text-xs rounded px-2 py-1"
            >
              <option value="all">Alla uppdrag</option>
              {missions.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>

        <div className="bg-muted/30 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border text-gray-9000 text-xs uppercase">
                <th className="text-left p-3 pl-4">Fil</th>
                <th className="text-left p-3">Uppdrag</th>
                <th className="text-left p-3">Geo</th>
                <th className="text-left p-3">AI-taggar</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Datum</th>
                <th className="text-left p-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((f, i) => {
                const meta = STATUS_META[f.status]
                return (
                  <tr key={f.id} className={`border-b border-gray-200/50 hover:bg-gray-750 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
                    <td className="p-3 pl-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-muted rounded flex items-center justify-center text-sm">🖼️</div>
                        <span className="font-medium text-gray-800">{f.name}</span>
                      </div>
                    </td>
                    <td className="p-3 text-gray-9000 text-xs">{f.missionId}</td>
                    <td className="p-3 text-gray-9000 text-xs">
                      {f.lat ? `${f.lat.toFixed(3)}, ${f.lng?.toFixed(3)}` : '—'}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {f.aiTags?.slice(0, 3).map(tag => (
                          <span key={tag} className="text-xs bg-blue-900/50 text-blue-400 px-1.5 py-0.5 rounded border border-blue-800">
                            {tag}
                          </span>
                        ))}
                        {!f.aiTags && <span className="text-gray-9000 text-xs">—</span>}
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ color: meta.color, backgroundColor: meta.bg }}>
                        {meta.label}
                      </span>
                    </td>
                    <td className="p-3 text-gray-9000 text-xs">{f.uploadedAt}</td>
                    <td className="p-3">
                      {f.cdnUrl && (
                        <a
                          href={f.cdnUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-700 hover:text-blue-300 underline whitespace-nowrap"
                        >
                          View CDN ↗
                        </a>
                      )}
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-gray-9000 py-8">Inga filer matchar filtret</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── 4. Storage Stats ── */}
      <section>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span>🗄️</span> Storage (S3 Multi-Region)
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STORAGE_BUCKETS.map(b => (
            <div key={b.id} className="bg-muted/30 rounded-xl p-4 border border-surface-border">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xl">{b.flag}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${
                  b.role === 'primary'
                    ? 'text-blue-700 border-blue-800 bg-blue-900/30'
                    : 'text-gray-9000 border-surface-border bg-muted/30'
                }`}>
                  {b.role === 'primary' ? 'Primary' : 'Backup (CRR)'}
                </span>
              </div>
              <div className="font-semibold text-gray-800 mb-1">{b.label}</div>
              <div className="text-xs text-gray-9000 mb-3">{b.region}</div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-9000">Lagring</span>
                  <span className="text-text-primary font-medium">{b.estimatedGb} GB</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-9000">Objekt</span>
                  <span className="text-text-primary font-medium">{b.objectCount.toLocaleString()}</span>
                </div>
              </div>
              {/* Mini usage bar */}
              <div className="mt-3 h-1 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${Math.min((b.estimatedGb / 50) * 100, 100)}%` }}
                />
              </div>
              <div className="text-xs text-gray-9000 mt-1">{((b.estimatedGb / 50) * 100).toFixed(1)}% av 50 GB</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
