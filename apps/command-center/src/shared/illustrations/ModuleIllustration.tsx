import { useState } from 'react'
import { getModuleIllustration } from './IllustrationMap'

interface ModuleIllustrationProps {
  route: string
  alt?: string
  size?: 'sm' | 'md' | 'lg' | 'hero'
  float?: boolean
  className?: string
  style?: React.CSSProperties
}

const SIZES = {
  sm:   { width: 80,  height: 80 },
  md:   { width: 140, height: 140 },
  lg:   { width: 200, height: 200 },
  hero: { width: 280, height: 280 },
}

export function ModuleIllustration({ route, alt, size = 'md', float = false, className, style }: ModuleIllustrationProps) {
  const [loaded, setLoaded] = useState(false)
  const src = getModuleIllustration(route)
  const { width, height } = SIZES[size]
  return (
    <div className={className} style={{ width, height, flexShrink: 0, ...style }}>
      {!loaded && <div className="wv-skeleton" style={{ width, height, borderRadius: 12 }} />}
      <img
        src={src} alt={alt ?? `${route} illustration`}
        width={width} height={height}
        onLoad={() => setLoaded(true)}
        style={{
          display: loaded ? 'block' : 'none', width, height,
          objectFit: 'contain', borderRadius: 0,
          animation: loaded
            ? `wv-illustration-enter 0.45s cubic-bezier(0.22,1,0.36,1) both${float ? ', wv-float-slow 6s ease-in-out 0.5s infinite' : ''}`
            : 'none',
        }}
      />
    </div>
  )
}

/**
 * ModuleHeader — cream-themed header med illustration synligt integrerad till höger.
 * Illustration är fullt synlig, ingen toning, gifter sig med cream/navy/gold-temat.
 */
interface ModuleHeaderProps {
  route: string
  label: string
  title: string
  description?: string
  badge?: React.ReactNode
  illustrationSize?: ModuleIllustrationProps['size']
  variant?: 'default' | 'accent'
}

export function ModuleHeader({
  route,
  label,
  title,
  description,
  badge,
  illustrationSize = 'lg',
  variant = 'default',
}: ModuleHeaderProps) {
  const [imgLoaded, setImgLoaded] = useState(false)
  const src = getModuleIllustration(route)
  const imgWidth = illustrationSize === 'hero' ? 220 : illustrationSize === 'lg' ? 180 : 140

  const isAccent = variant === 'accent'

  return (
    <div
      className="wv-header-enter"
      style={{
        background: isAccent ? 'var(--color-brand)' : '#F5F0E8',
        border: isAccent ? 'none' : '1px solid var(--color-border)',
        borderRadius: 14,
        padding: '24px 32px',
        marginBottom: 24,
        position: 'relative',
        overflow: 'hidden',
        minHeight: 110,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
      }}
    >
      {/* Vänster: text */}
      <div style={{ flex: 1, minWidth: 0, position: 'relative', zIndex: 1 }}>
        <div style={{
          fontSize: 10,
          fontFamily: 'monospace',
          color: isAccent ? 'var(--color-accent)' : 'var(--color-accent)',
          letterSpacing: '.18em',
          textTransform: 'uppercase',
          marginBottom: 6,
          fontWeight: 600,
        }}>
          {label}
        </div>
        <h2 style={{
          fontSize: 22,
          fontWeight: 800,
          margin: '0 0 6px',
          lineHeight: 1.2,
          letterSpacing: '-0.02em',
          color: isAccent ? '#F5F0E8' : 'var(--color-text-primary)',
        }}>
          {title}
        </h2>
        {description && (
          <p style={{
            fontSize: 13,
            color: isAccent ? 'rgba(245,240,232,0.65)' : 'var(--color-text-secondary)',
            margin: 0,
            lineHeight: 1.55,
          }}>
            {description}
          </p>
        )}
        {badge && <div style={{ marginTop: 10 }}>{badge}</div>}
      </div>

      {/* Höger: illustration — fullt synlig, ingen toning */}
      <div style={{
        flexShrink: 0,
        width: imgWidth,
        height: imgWidth,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}>
        {!imgLoaded && (
          <div className="wv-skeleton" style={{ width: imgWidth, height: imgWidth, borderRadius: 12 }} />
        )}
        <img
          src={src}
          alt=""
          aria-hidden="true"
          onLoad={() => setImgLoaded(true)}
          style={{
            display: imgLoaded ? 'block' : 'none',
            width: imgWidth,
            height: imgWidth,
            objectFit: 'contain',
            opacity: 1,
            transition: 'opacity 0.4s ease',
            animation: imgLoaded ? 'wv-illustration-enter 0.5s cubic-bezier(0.22,1,0.36,1) both, wv-float-slow 7s ease-in-out 0.8s infinite' : 'none',
            pointerEvents: 'none',
            userSelect: 'none',
            filter: 'none',
          }}
        />
      </div>
    </div>
  )
}

/**
 * SectionIllustration — empty state / onboarding.
 * Illustrationen är fullt synlig, flödar med innehållet, ingen ram.
 */
interface SectionIllustrationProps {
  route: string
  title: string
  description?: string
  action?: React.ReactNode
}

export function SectionIllustration({ route, title, description, action }: SectionIllustrationProps) {
  const [loaded, setLoaded] = useState(false)
  const src = getModuleIllustration(route)

  return (
    <div className="wv-card-enter" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '48px 32px',
      textAlign: 'center',
      gap: 0,
    }}>
      <div style={{ marginBottom: 20 }}>
        {!loaded && <div className="wv-skeleton" style={{ width: 160, height: 160, borderRadius: 12 }} />}
        <img
          src={src} alt="" aria-hidden="true"
          onLoad={() => setLoaded(true)}
          style={{
            display: loaded ? 'block' : 'none',
            width: 160,
            height: 160,
            objectFit: 'contain',
            filter: 'none',
            animation: loaded ? 'wv-illustration-enter 0.5s ease both, wv-float-slow 6s ease-in-out 0.6s infinite' : 'none',
          }}
        />
      </div>
      <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-text-primary)', marginBottom: 8 }}>
        {title}
      </div>
      {description && (
        <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', maxWidth: 320, lineHeight: 1.6 }}>
          {description}
        </div>
      )}
      {action && <div style={{ marginTop: 20 }}>{action}</div>}
    </div>
  )
}
