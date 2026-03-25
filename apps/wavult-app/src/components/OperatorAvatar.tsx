// ─── Wavult App — Operator Avatar ───────────────────────────────────────────────
// Reusable avatar component. Shows uploaded photo if available, falls back
// to styled initials. Supports multiple sizes and optional accent ring.

import { useState } from 'react'
import { useAvatar } from '../lib/AvatarContext'

interface OperatorAvatarProps {
  /** Override avatar URL (for showing other users' avatars) */
  avatarUrl?: string | null
  /** Fallback initials when no avatar */
  initials: string
  /** Accent color for the ring and fallback background */
  color?: string
  /** Pixel size */
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** Show colored ring around avatar */
  ring?: boolean
  /** Click handler (e.g., open uploader) */
  onClick?: () => void
}

const SIZE_MAP: Record<string, { px: number; text: string; rounded: string }> = {
  sm: { px: 28, text: 'text-[9px]', rounded: 'rounded-lg' },
  md: { px: 40, text: 'text-xs', rounded: 'rounded-xl' },
  lg: { px: 56, text: 'text-base', rounded: 'rounded-2xl' },
  xl: { px: 80, text: 'text-xl', rounded: 'rounded-2xl' },
}

export function OperatorAvatar({
  avatarUrl: overrideUrl,
  initials,
  color = '#C4961A',
  size = 'md',
  ring = false,
  onClick,
}: OperatorAvatarProps) {
  const { avatarUrl: contextUrl } = useAvatar()
  const [imgError, setImgError] = useState(false)
  const config = SIZE_MAP[size]

  // Use override if provided, otherwise use context
  const effectiveUrl = overrideUrl !== undefined ? overrideUrl : contextUrl
  const showImage = effectiveUrl && !imgError

  const containerStyle: React.CSSProperties = {
    width: config.px,
    height: config.px,
    ...(ring ? {
      boxShadow: `0 0 0 2px ${color}40, 0 0 0 4px #0F1218`,
    } : {}),
  }

  const Component = onClick ? 'button' : 'div'

  return (
    <Component
      onClick={onClick}
      className={`
        ${config.rounded} overflow-hidden flex-shrink-0
        flex items-center justify-center font-bold
        ${config.text}
        ${onClick ? 'cursor-pointer active:scale-95 transition-transform' : ''}
      `}
      style={{
        ...containerStyle,
        background: showImage ? '#14181E' : color + '20',
        color: showImage ? 'transparent' : color,
      }}
    >
      {showImage ? (
        <img
          src={effectiveUrl}
          alt={initials}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
          loading="lazy"
        />
      ) : (
        initials
      )}
    </Component>
  )
}
