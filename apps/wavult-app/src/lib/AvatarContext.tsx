// ─── Wavult App — Avatar Context ────────────────────────────────────────────
// Photo upload avatar system. Stores images in Supabase Storage (bucket: avatars).
// Saves the public URL in user_metadata.avatar_url.
// No third-party dependency — your photo, your infrastructure.

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from './AuthContext'
import { supabase } from './supabase'

// ─── Configuration ───────────────────────────────────────────────────────────

const AVATAR_BUCKET = 'avatars'
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

// ─── Context ─────────────────────────────────────────────────────────────────

interface AvatarContextValue {
  avatarUrl: string | null
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

  // Load avatar from user metadata
  useEffect(() => {
    const url = user?.user_metadata?.avatar_url
    setAvatarUrl(typeof url === 'string' ? url : null)
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
      // Upload to Supabase Storage: avatars/{userId}.{ext}
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

      // Append cache-busting timestamp
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`

      // Save to user metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl },
      })

      if (updateError) return { error: updateError.message }

      setAvatarUrl(publicUrl)
      setIsUploaderOpen(false)
      return { error: null }
    } finally {
      setSaving(false)
    }
  }, [user])

  const removeAvatar = useCallback(async () => {
    if (!user) return
    setSaving(true)
    try {
      // Remove from storage (try common extensions)
      for (const ext of ['jpg', 'jpeg', 'png', 'webp']) {
        await supabase.storage.from(AVATAR_BUCKET).remove([`${user.id}.${ext}`])
      }

      // Clear from user metadata
      await supabase.auth.updateUser({ data: { avatar_url: null } })
      setAvatarUrl(null)
    } finally {
      setSaving(false)
    }
  }, [user])

  return (
    <AvatarContext.Provider value={{
      avatarUrl, isUploaderOpen,
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
