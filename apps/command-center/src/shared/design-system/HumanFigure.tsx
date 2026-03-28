/**
 * HumanFigure — Enterprise person/role icon component
 *
 * Monochrome blue silhouette: circular head + rectangular torso (suit/body shape).
 * No visible arms or legs — clean icon style matching enterprise UI references.
 *
 * Sizes:  sm=16  md=24  lg=40  xl=64
 * Variants: single | group (3–5 figures with slight overlap)
 *
 * Color: var(--color-brand) = #0066CC by default, fully overridable.
 */

// ─── Proportions ──────────────────────────────────────────────────────────────
// viewBox is 20×28. Head: circle r=5 at (10,6). Body: rounded rect below.
// Kept intentionally simple — no arms, no legs, just the silhouette mass.

const SIZE_MAP = {
  sm: 16,
  md: 24,
  lg: 40,
  xl: 64,
} as const

type Size = keyof typeof SIZE_MAP

interface HumanFigureProps {
  /** Icon size */
  size?: Size
  /** Color — defaults to var(--color-brand) */
  color?: string
  /** Show a single figure or a group of 3–5 with overlap */
  variant?: 'single' | 'group'
  /** How many figures in group variant (3–5, default 3) */
  count?: number
  /** Additional wrapper className */
  className?: string
  /** Accessible label */
  label?: string
}

/** Single person silhouette SVG — viewBox 20×28 */
function PersonSVG({ color, px }: { color: string; px: number }) {
  return (
    <svg
      width={px}
      height={Math.round(px * 1.4)}
      viewBox="0 0 20 28"
      fill={color}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ display: 'block', flexShrink: 0 }}
    >
      {/* Head — perfect circle */}
      <circle cx="10" cy="6" r="5" />

      {/* Body — rounded-top rectangle, tapers slightly at shoulder */}
      {/*
        Shoulder line starts at y≈12 (just below neck).
        Width narrows from 16px at shoulder to 14px at base.
        rx=3 gives a slight rounded bottom edge.
      */}
      <rect x="2" y="13" width="16" height="15" rx="4" ry="4" />
    </svg>
  )
}

/** Single HumanFigure */
function SingleFigure({
  size = 'md',
  color = 'var(--color-brand)',
  className = '',
  label,
}: Pick<HumanFigureProps, 'size' | 'color' | 'className' | 'label'>) {
  const px = SIZE_MAP[size]
  return (
    <span
      className={className}
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
      role={label ? 'img' : undefined}
      aria-label={label}
    >
      <PersonSVG color={color!} px={px} />
    </span>
  )
}

/** Group of 3–5 figures with slight left-to-right overlap */
function GroupFigure({
  size = 'md',
  color = 'var(--color-brand)',
  count = 3,
  className = '',
  label,
}: Pick<HumanFigureProps, 'size' | 'color' | 'count' | 'className' | 'label'>) {
  const px = SIZE_MAP[size]
  const figureH = Math.round(px * 1.4)

  // Clamp count 3–5
  const n = Math.min(5, Math.max(3, count ?? 3))

  // Overlap: 30% of width per step, so figures stack naturally
  const overlapFraction = 0.30
  const step = Math.round(px * (1 - overlapFraction))
  const totalW = px + step * (n - 1)

  // Vary opacity slightly so overlapping figures are distinguishable
  const opacities = [1, 0.85, 0.70, 0.85, 1]

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'flex-end',
        position: 'relative',
        width: totalW,
        height: figureH,
        flexShrink: 0,
      }}
      role={label ? 'img' : undefined}
      aria-label={label ?? `Group of ${n} people`}
    >
      {Array.from({ length: n }).map((_, i) => (
        <span
          key={i}
          style={{
            position: 'absolute',
            left: i * step,
            bottom: 0,
            opacity: opacities[i] ?? 0.75,
          }}
        >
          <PersonSVG color={color!} px={px} />
        </span>
      ))}
    </span>
  )
}

// ─── Public export ────────────────────────────────────────────────────────────

export function HumanFigure({
  size = 'md',
  color = 'var(--color-brand)',
  variant = 'single',
  count = 3,
  className = '',
  label,
}: HumanFigureProps) {
  if (variant === 'group') {
    return (
      <GroupFigure
        size={size}
        color={color}
        count={count}
        className={className}
        label={label}
      />
    )
  }
  return (
    <SingleFigure
      size={size}
      color={color}
      className={className}
      label={label}
    />
  )
}

// ─── Demo (remove in production — useful for Storybook / local dev) ───────────
export function HumanFigureDemo() {
  return (
    <div
      style={{
        fontFamily: 'var(--font-sans)',
        padding: 32,
        background: 'var(--color-bg)',
        display: 'flex',
        flexDirection: 'column',
        gap: 32,
      }}
    >
      <div>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 11, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Single — sizes
        </p>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24 }}>
          <HumanFigure size="sm" label="Small figure" />
          <HumanFigure size="md" label="Medium figure" />
          <HumanFigure size="lg" label="Large figure" />
          <HumanFigure size="xl" label="XL figure" />
        </div>
      </div>

      <div>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 11, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Group variant
        </p>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 48 }}>
          <HumanFigure variant="group" count={3} size="md" label="Team of 3" />
          <HumanFigure variant="group" count={4} size="md" label="Team of 4" />
          <HumanFigure variant="group" count={5} size="md" label="Team of 5" />
        </div>
      </div>

      <div>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 11, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Large group example (org / meeting participants)
        </p>
        <HumanFigure variant="group" count={5} size="lg" label="Meeting participants" />
      </div>
    </div>
  )
}
