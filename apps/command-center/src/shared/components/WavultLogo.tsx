/**
 * WavultLogo — vektoriserad, transparent bakgrund, enfärgad
 *
 * Varianter:
 *   variant="navy"   → #0A3D62 (primary, ljus bakgrund)
 *   variant="white"  → #F5F0E8 (reversed, mörk bakgrund — sidebar)
 *   variant="black"  → #0A0A0A (monochrome, tryck)
 *
 * Aldrig vit bakgrund. Alltid transparent.
 */

interface WavultLogoProps {
  size?: number
  className?: string
  showWordmark?: boolean
  variant?: 'navy' | 'white' | 'black'
  /** @deprecated använd variant="white" */
  light?: boolean
}

const SVG_PATHS = {
  wings: [
    'M 28,40 C 10,50 0,80 8,118 C 14,145 32,162 52,170 C 60,173 70,174 76,172 L 68,152 C 58,154 46,148 38,134 C 28,116 28,88 40,68 C 46,58 55,50 64,46 L 52,28 C 42,30 34,34 28,40 Z',
    'M 272,40 C 290,50 300,80 292,118 C 286,145 268,162 248,170 C 240,173 230,174 224,172 L 232,152 C 242,154 254,148 262,134 C 272,116 272,88 260,68 C 254,58 245,50 236,46 L 248,28 C 258,30 266,34 272,40 Z',
    'M 150,196 L 88,28 L 212,28 Z',
  ],
}

const COLORS = {
  navy:  '#0A3D62',
  white: '#F5F0E8',
  black: '#0A0A0A',
}

const WORDMARK_COLORS = {
  navy:  '#0A3D62',
  white: '#F5F0E8',
  black: '#0A0A0A',
}

export function WavultLogo({
  size = 40,
  className = '',
  showWordmark = false,
  variant,
  light,
}: WavultLogoProps) {
  // Bakåtkompatibilitet
  const resolvedVariant = variant ?? (light === false ? 'navy' : 'white')
  const fill = COLORS[resolvedVariant]
  const wordmarkColor = WORDMARK_COLORS[resolvedVariant]
  const showGold = resolvedVariant !== 'black'

  const h = Math.round(size * 0.67)

  return (
    <div className={`inline-flex items-center gap-2 ${className}`} style={{ flexShrink: 0 }}>
      <svg
        viewBox="0 0 300 200"
        width={size}
        height={h}
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Wavult"
        style={{ display: 'block', flexShrink: 0 }}
      >
        {showGold && (
          <defs>
            <radialGradient id={`glow-${resolvedVariant}`} cx="50%" cy="100%" r="35%">
              <stop offset="0%" stopColor="#E8B84B" stopOpacity="0.95"/>
              <stop offset="50%" stopColor="#E8B84B" stopOpacity="0.35"/>
              <stop offset="100%" stopColor="#E8B84B" stopOpacity="0"/>
            </radialGradient>
          </defs>
        )}

        {/* Vänster vinge */}
        <path d={SVG_PATHS.wings[0]} fill={fill}/>
        {/* Höger vinge */}
        <path d={SVG_PATHS.wings[1]} fill={fill}/>
        {/* Triangel */}
        <path d={SVG_PATHS.wings[2]} fill={fill}/>

        {/* Guldglöd vid spetsen */}
        {showGold && (
          <>
            <ellipse cx="150" cy="193" rx="20" ry="9" fill={`url(#glow-${resolvedVariant})`}/>
            <circle cx="150" cy="196" r="3" fill="#E8B84B"/>
          </>
        )}
      </svg>

      {showWordmark && (
        <span style={{
          color: wordmarkColor,
          fontSize: Math.round(size * 0.38),
          fontWeight: 700,
          letterSpacing: '0.10em',
          lineHeight: 1,
          fontFamily: 'var(--font-mono, monospace)',
          textTransform: 'uppercase' as const,
        }}>
          WAVULT DS
        </span>
      )}
    </div>
  )
}

export default WavultLogo
