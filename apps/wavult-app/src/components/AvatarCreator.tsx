// ─── Wavult App — Avatar Uploader ───────────────────────────────────────────────
// Full-screen modal for photo upload. Supports camera capture on mobile,
// file picker on desktop, drag-and-drop. Preview before confirming.

import { useState, useRef, useCallback, useEffect } from 'react'
import { useAvatar } from '../lib/AvatarContext'

export function AvatarCreator() {
  const { isUploaderOpen, closeUploader, uploadAvatar, saving, duixCloneStatus } = useAvatar()
  const [showCloneStatus, setShowCloneStatus] = useState(false)

  // Show clone status briefly after upload completes
  useEffect(() => {
    if (duixCloneStatus === 'cloning') setShowCloneStatus(true)
    if (duixCloneStatus === 'ready' || duixCloneStatus === 'failed') {
      const t = setTimeout(() => setShowCloneStatus(false), 3000)
      return () => clearTimeout(t)
    }
  }, [duixCloneStatus])
  const [preview, setPreview] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((file: File) => {
    setError(null)
    setSelectedFile(file)
    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target?.result as string)
    reader.readAsDataURL(file)
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  const handleConfirm = async () => {
    if (!selectedFile) return
    const result = await uploadAvatar(selectedFile)
    if (result.error) {
      setError(result.error)
    } else {
      reset()
    }
  }

  const reset = () => {
    setPreview(null)
    setSelectedFile(null)
    setError(null)
    setDragOver(false)
  }

  const handleClose = () => {
    reset()
    closeUploader()
  }

  if (!isUploaderOpen) return null

  return (
    <div className="fixed inset-0 z-[100] bg-w-bg/95 backdrop-blur-xl flex flex-col animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-w-border flex-shrink-0">
        <div>
          <h2 className="text-sm font-bold text-tx-primary">Upload Photo</h2>
          <p className="text-label text-tx-tertiary font-mono mt-0.5">JPEG, PNG or WebP — max 5 MB</p>
        </div>
        <button
          onClick={handleClose}
          disabled={saving}
          className="text-tx-tertiary hover:text-tx-primary transition-colors text-lg px-2 disabled:opacity-50"
        >
          ✕
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-8">
        {preview ? (
          /* ─── Preview ─── */
          <div className="text-center animate-fade-in">
            <div className="relative inline-block mb-6">
              <img
                src={preview}
                alt="Preview"
                className="h-40 w-40 rounded-2xl object-cover border-2 border-w-border"
              />
              {/* Accent ring preview */}
              <div
                className="absolute inset-0 rounded-2xl pointer-events-none"
                style={{ boxShadow: '0 0 0 3px rgba(196, 150, 26, 0.3)' }}
              />
              {/* Duix clone status overlay */}
              {showCloneStatus && duixCloneStatus === 'cloning' && (
                <div className="absolute inset-0 rounded-2xl bg-w-bg/70 flex items-center justify-center">
                  <div className="text-center">
                    <div className="h-5 w-5 border-2 border-signal-amber/30 border-t-signal-amber rounded-full animate-spin mx-auto mb-1" />
                    <p className="text-[9px] font-mono text-signal-amber">CREATING CLONE</p>
                  </div>
                </div>
              )}
              {showCloneStatus && duixCloneStatus === 'ready' && (
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-signal-green/20 border border-signal-green/30">
                  <p className="text-[8px] font-mono text-signal-green whitespace-nowrap">DIGITAL TWIN READY</p>
                </div>
              )}
            </div>

            {error && (
              <div className="mb-4 px-3 py-2 rounded-lg bg-signal-red/10 border border-signal-red/20 text-xs text-signal-red max-w-xs mx-auto">
                {error}
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <button
                onClick={handleConfirm}
                disabled={saving}
                className="app-btn app-btn--primary max-w-[160px] disabled:opacity-50"
              >
                {saving ? 'Uploading...' : 'Confirm'}
              </button>
              <button
                onClick={reset}
                disabled={saving}
                className="app-btn app-btn--ghost max-w-[160px] disabled:opacity-50"
              >
                Choose Another
              </button>
            </div>
          </div>
        ) : (
          /* ─── Upload zone ─── */
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`
              w-full max-w-sm border-2 border-dashed rounded-2xl p-10 text-center
              transition-all cursor-pointer
              ${dragOver
                ? 'border-signal-amber bg-signal-amber/5'
                : 'border-w-border hover:border-w-border-light'
              }
            `}
            onClick={() => fileInputRef.current?.click()}
          >
            {/* Camera icon */}
            <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-w-card border border-w-border flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#5A6170" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </div>

            <p className="text-sm text-tx-secondary font-medium mb-1">
              Drop a photo here
            </p>
            <p className="text-xs text-tx-muted">
              or tap to choose from gallery
            </p>

            {error && (
              <div className="mt-4 px-3 py-2 rounded-lg bg-signal-red/10 border border-signal-red/20 text-xs text-signal-red">
                {error}
              </div>
            )}
          </div>
        )}

        {/* Camera capture button (mobile) */}
        {!preview && (
          <button
            onClick={() => cameraInputRef.current?.click()}
            className="mt-4 text-xs px-4 py-2 rounded-pill font-medium text-signal-amber bg-signal-amber/10 border border-signal-amber/20 active:scale-95 transition-transform"
          >
            Take a Selfie
          </button>
        )}

        {/* Hidden file inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          className="hidden"
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="user"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    </div>
  )
}
