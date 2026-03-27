import React from 'react'
import {
  MaturityLevel,
  MATURITY_COLORS,
  MATURITY_LABELS,
  MATURITY_DESCRIPTION,
  MATURITY_BG,
} from './maturityModel'

interface MaturityBadgeProps {
  level: MaturityLevel
  size?: 'xs' | 'sm' | 'md'
}

export function MaturityBadge({ level, size = 'sm' }: MaturityBadgeProps) {
  const color = MATURITY_COLORS[level]
  const label = MATURITY_LABELS[level]
  const description = MATURITY_DESCRIPTION[level]
  const bg = MATURITY_BG[level]

  if (size === 'xs') {
    // Tiny dot + label for sidebar
    return (
      <span className="flex items-center gap-1 flex-shrink-0">
        <span
          className="rounded-full flex-shrink-0"
          style={{ width: 5, height: 5, background: color }}
        />
        <span
          className="font-mono leading-none"
          style={{ fontSize: 8, color, letterSpacing: '0.04em' }}
        >
          {label}
        </span>
      </span>
    )
  }

  if (size === 'sm') {
    // Pill with label — for nav-headers
    return (
      <span
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-mono font-bold"
        style={{
          fontSize: 9,
          background: bg,
          color,
          border: `1px solid ${color}33`,
          letterSpacing: '0.06em',
        }}
      >
        <span
          className="rounded-full flex-shrink-0"
          style={{ width: 4, height: 4, background: color }}
        />
        {label}
      </span>
    )
  }

  // md — larger pill with description, for module headers
  return (
    <span
      className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg font-mono font-bold"
      style={{
        fontSize: 11,
        background: bg,
        color,
        border: `1px solid ${color}44`,
        letterSpacing: '0.05em',
      }}
      title={description}
    >
      <span
        className="rounded-full flex-shrink-0"
        style={{ width: 6, height: 6, background: color }}
      />
      {label}
    </span>
  )
}
