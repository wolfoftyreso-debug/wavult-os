// ─── Wavult App — Avatar Context ────────────────────────────────────────────
// Unified avatar system. One photo upload triggers:
//   1. Supabase Storage → profile picture
//   2. Duix API → digital human clone of your face
//
// The operator never thinks about "creating a digital human" — they just
// set their profile photo, and the system does the rest.

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from './AuthContext'
import { supabase } from './supabase'

// ─── Configuration ───────────────────────────────────────────────────────────

const AVATAR_BUCKET = 'avatars'
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

const API_URL = import.meta.env.VITE_API_URL || ''

// ─── Duix face clone via server proxy ────────────────────────────────────────
// Client NEVER holds Duix credentials. All calls go through /api/duix/*

interface DuixCloneResult {
  success: boolean
  avatarId?: string
  error?: string
}

async function createDuixFaceClone(
  imageUrl: string,
  operatorName: string,
): Promise<DuixCloneResult> {
  if (!API_URL) return { success: false, error: 'API_URL not configured' }

  try {
    const res = await fetch(`${API_URL}/api/duix/create-avatar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrl, name: operatorName }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      return { success: false, error: data.error || `Server ${res.status}` }
    }

    const data = await res.json()
    return { success: data.success, avatarId: data.avatarId }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

// ─── Context ─────────────────────────────────────────────────────────────────

interface AvatarContextValue {
  avatarUrl: string | null
  /** Duix avatar clone status */
  duixCloneStatus: 'idle' | 'cloning' | 'ready' | 'failed'
  duixAvatarId: string | null
  isUploaderOpen: boolean
  openUploader: () => void
  closeUploader: () => void
  uploadAvatar: (file: File) => Promise<{ error: string | null }>
  removeAvatar: () => Promise<void>
  saving: boolean
}

const AvatarContext = createContext<AvatarContextValue | null>(null)

export function AvatarProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [isUploaderOpen, setIsUploaderOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [duixCloneStatus, setDuixCloneStatus] = useState<'idle' | 'cloning' | 'ready' | 'failed'>('idle')
  const [duixAvatarId, setDuixAvatarId] = useState<string | null>(null)

  // Load avatar + Duix status from user metadata
  useEffect(() => {
    if (!user) return
    const url = user.user_metadata?.avatar_url
    setAvatarUrl(typeof url === 'string' ? url : null)

    const dId = user.user_metadata?.duix_avatar_id
    if (typeof dId === 'string') {
      setDuixAvatarId(dId)
      setDuixCloneStatus('ready')
    }
  }, [user])

  const openUploader = useCallback(() => setIsUploaderOpen(true), [])
  const closeUploader = useCallback(() => setIsUploaderOpen(false), [])

  const uploadAvatar = useCallback(async (file: File): Promise<{ error: string | null }> => {
    if (!user) return { error: 'Not authenticated' }

    // Validate
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return { error: 'Only JPEG, PNG, and WebP are supported' }
    }
    if (file.size > MAX_FILE_SIZE) {
      return { error: 'File too large (max 5 MB)' }
    }

    setSaving(true)
    try {
      // ── Step 1: Upload to Supabase Storage ──────────────────────────────
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${user.id}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type })

      if (uploadError) return { error: uploadError.message }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(AVATAR_BUCKET)
        .getPublicUrl(path)

      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`

      // Save profile photo URL to user metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl },
      })

      if (updateError) return { error: updateError.message }

      setAvatarUrl(publicUrl)
      setIsUploaderOpen(false)

      // ── Step 2: Create Duix face clone (async, non-blocking) ────────────
      if (API_URL) {
        setDuixCloneStatus('cloning')
        const operatorName = user.user_metadata?.full_name || user.email || 'Operator'

        // Fire and don't block the UI
        createDuixFaceClone(publicUrl, operatorName).then(async (result) => {
          if (result.success && result.avatarId) {
            setDuixAvatarId(result.avatarId)
            setDuixCloneStatus('ready')
            // Persist Duix avatar ID to user metadata
            await supabase.auth.updateUser({
              data: { duix_avatar_id: result.avatarId },
            })
          } else {
            setDuixCloneStatus('failed')
            console.warn('[Duix] Face clone failed:', result.error)
          }
        })
      }

      return { error: null }
    } finally {
      setSaving(false)
    }
  }, [user])

  const removeAvatar = useCallback(async () => {
    if (!user) return
    setSaving(true)
    try {
      for (const ext of ['jpg', 'jpeg', 'png', 'webp']) {
        await supabase.storage.from(AVATAR_BUCKET).remove([`${user.id}.${ext}`])
      }
      await supabase.auth.updateUser({
        data: { avatar_url: null, duix_avatar_id: null },
      })
      setAvatarUrl(null)
      setDuixAvatarId(null)
      setDuixCloneStatus('idle')
    } finally {
      setSaving(false)
    }
  }, [user])

  return (
    <AvatarContext.Provider value={{
      avatarUrl, duixCloneStatus, duixAvatarId, isUploaderOpen,
      openUploader, closeUploader, uploadAvatar, removeAvatar, saving,
    }}>
      {children}
    </AvatarContext.Provider>
  )
}

export function useAvatar() {
  const ctx = useContext(AvatarContext)
  if (!ctx) throw new Error('useAvatar must be used inside AvatarProvider')
  return ctx
}
