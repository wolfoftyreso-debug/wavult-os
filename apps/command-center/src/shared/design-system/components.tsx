/**
 * Wavult OS — Enterprise Design System Components
 *
 * All components use CSS custom properties from tokens.css.
 * No dark theme, no gradients, no glows — strict enterprise light UI.
 */

import React from 'react'
export { HumanFigure } from './HumanFigure'

// ─── Types ────────────────────────────────────────────────────────────────────

type StatusVariant = 'success' | 'warning' | 'danger' | 'neutral' | 'info'
type SizeVariant = 'sm' | 'md'

// ─── EnterpriseCard ───────────────────────────────────────────────────────────

interface EnterpriseCardProps {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  /** Remove default padding (for full-bleed content) */
  noPadding?: boolean
  onClick?: () => void
}

export function EnterpriseCard({
  children,
  className = '',
  style,
  noPadding = false,
  onClick,
}: EnterpriseCardProps) {
  return (
    <div
      className={className}
      onClick={onClick}
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: noPadding ? 0 : 'var(--space-6)',
        boxShadow: 'var(--shadow-sm)',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  StatusVariant,
  { bg: string; text: string; icon: string; label: string }
> = {
  success: { bg: 'var(--color-success-bg)', text: 'var(--color-success)', icon: '✓', label: 'Success' },
  warning: { bg: 'var(--color-warning-bg)', text: 'var(--color-warning)', icon: '!', label: 'Warning' },
  danger:  { bg: 'var(--color-danger-bg)',  text: 'var(--color-danger)',  icon: '✕', label: 'Danger'  },
  neutral: { bg: 'var(--color-neutral-bg)', text: 'var(--color-neutral)', icon: '–', label: 'Neutral' },
  info:    { bg: 'var(--color-info-bg)',    text: 'var(--color-info)',    icon: 'i', label: 'Info'    },
}

interface StatusBadgeProps {
  variant: StatusVariant
  label?: string
  size?: SizeVariant
  /** Override display label */
  customLabel?: string
}

export function StatusBadge({
  variant,
  label,
  size = 'md',
  customLabel,
}: StatusBadgeProps) {
  const cfg = STATUS_CONFIG[variant]
  const displayLabel = customLabel ?? label ?? cfg.label
  const isSm = size === 'sm'

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: isSm ? 3 : 4,
        background: cfg.bg,
        color: cfg.text,
        borderRadius: 999,
        padding: isSm ? '2px 7px' : '3px 10px',
        fontSize: isSm ? 'var(--text-xs)' : 'var(--text-sm)',
        fontWeight: 'var(--font-medium)' as React.CSSProperties['fontWeight'],
        fontFamily: 'var(--font-sans)',
        whiteSpace: 'nowrap',
        lineHeight: 1.4,
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: isSm ? 13 : 15,
          height: isSm ? 13 : 15,
          borderRadius: '50%',
          background: cfg.text,
          color: '#fff',
          fontSize: isSm ? 8 : 9,
          fontWeight: 700,
          flexShrink: 0,
          lineHeight: 1,
        }}
      >
        {cfg.icon}
      </span>
      {displayLabel}
    </span>
  )
}

// ─── DataTable ────────────────────────────────────────────────────────────────

interface DataTableColumn<T> {
  key: keyof T | string
  header: string
  width?: string | number
  render?: (row: T) => React.ReactNode
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  rows: T[]
  keyField: keyof T
  onRowClick?: (row: T) => void
  emptyMessage?: string
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  rows,
  keyField,
  onRowClick,
  emptyMessage = 'Inga rader',
}: DataTableProps<T>) {
  return (
    <div
      style={{
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        background: 'var(--color-surface)',
      }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
        <thead>
          <tr
            style={{
              background: 'var(--color-bg-subtle)',
              borderBottom: '1px solid var(--color-border)',
            }}
          >
            {columns.map((col) => (
              <th
                key={String(col.key)}
                style={{
                  padding: '10px 14px',
                  textAlign: 'left',
                  fontWeight: 'var(--font-semibold)' as React.CSSProperties['fontWeight'],
                  color: 'var(--color-text-secondary)',
                  fontSize: 'var(--text-xs)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  whiteSpace: 'nowrap',
                  width: col.width,
                }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                style={{
                  padding: '32px 14px',
                  textAlign: 'center',
                  color: 'var(--color-text-muted)',
                  fontSize: 'var(--text-sm)',
                }}
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={String(row[keyField])}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                style={{
                  borderBottom: '1px solid var(--color-border)',
                  cursor: onRowClick ? 'pointer' : 'default',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLTableRowElement).style.background =
                    'var(--color-bg-subtle)'
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLTableRowElement).style.background = ''
                }}
              >
                {columns.map((col) => (
                  <td
                    key={String(col.key)}
                    style={{
                      padding: '10px 14px',
                      color: 'var(--color-text-primary)',
                      verticalAlign: 'middle',
                    }}
                  >
                    {col.render
                      ? col.render(row)
                      : String(row[col.key as keyof T] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

// ─── Buttons ──────────────────────────────────────────────────────────────────

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
}

const BUTTON_BASE: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  borderRadius: 'var(--radius-md)',
  fontFamily: 'var(--font-sans)',
  fontWeight: 500,
  fontSize: 'var(--text-sm)',
  cursor: 'pointer',
  border: 'none',
  transition: 'background 0.12s, color 0.12s, border-color 0.12s',
  whiteSpace: 'nowrap',
}

function buttonPadding(size?: 'sm' | 'md' | 'lg'): string {
  if (size === 'sm') return '5px 10px'
  if (size === 'lg') return '10px 20px'
  return '8px 16px'
}

export function PrimaryButton({ children, size, style, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      style={{
        ...BUTTON_BASE,
        padding: buttonPadding(size),
        background: 'var(--color-brand)',
        color: 'var(--color-text-inverse)',
        ...style,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-brand-hover)'
        rest.onMouseEnter?.(e)
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-brand)'
        rest.onMouseLeave?.(e)
      }}
    >
      {children}
    </button>
  )
}

export function SecondaryButton({ children, size, style, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      style={{
        ...BUTTON_BASE,
        padding: buttonPadding(size),
        background: 'var(--color-surface)',
        color: 'var(--color-text-primary)',
        border: '1px solid var(--color-border)',
        ...style,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-bg-subtle)'
        rest.onMouseEnter?.(e)
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-surface)'
        rest.onMouseLeave?.(e)
      }}
    >
      {children}
    </button>
  )
}

export function DangerButton({ children, size, style, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      style={{
        ...BUTTON_BASE,
        padding: buttonPadding(size),
        background: 'var(--color-danger)',
        color: 'var(--color-text-inverse)',
        ...style,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.opacity = '0.9'
        rest.onMouseEnter?.(e)
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.opacity = '1'
        rest.onMouseLeave?.(e)
      }}
    >
      {children}
    </button>
  )
}

// ─── SectionHeader ────────────────────────────────────────────────────────────

interface SectionHeaderProps {
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function SectionHeader({
  title,
  description,
  action,
  className = '',
}: SectionHeaderProps) {
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        paddingBottom: 'var(--space-4)',
        borderBottom: '1px solid var(--color-border)',
        marginBottom: 'var(--space-5)',
        gap: 'var(--space-4)',
      }}
    >
      <div>
        <h2
          style={{
            margin: 0,
            fontSize: 'var(--text-lg)',
            fontWeight: 'var(--font-semibold)' as React.CSSProperties['fontWeight'],
            color: 'var(--color-text-primary)',
            lineHeight: 1.25,
            fontFamily: 'var(--font-sans)',
          }}
        >
          {title}
        </h2>
        {description && (
          <p
            style={{
              margin: '4px 0 0',
              fontSize: 'var(--text-sm)',
              color: 'var(--color-text-muted)',
              fontFamily: 'var(--font-sans)',
            }}
          >
            {description}
          </p>
        )}
      </div>
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </div>
  )
}

// ─── KPICard (bonus utility used in MilestonesHub) ───────────────────────────

interface KPICardProps {
  label: string
  value: string | number
  subtext?: string
  variant?: StatusVariant | 'default'
  icon?: React.ReactNode
}

export function KPICard({ label, value, subtext, variant = 'default', icon }: KPICardProps) {
  const accentColor =
    variant === 'success' ? 'var(--color-success)' :
    variant === 'warning' ? 'var(--color-warning)' :
    variant === 'danger'  ? 'var(--color-danger)'  :
    variant === 'info'    ? 'var(--color-brand)'   :
    'var(--color-text-primary)'

  return (
    <EnterpriseCard>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-sans)' }}>
          {label}
        </span>
        {icon && <span style={{ color: 'var(--color-text-muted)' }}>{icon}</span>}
      </div>
      <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: accentColor, fontFamily: 'var(--font-sans)', lineHeight: 1 }}>
        {value}
      </div>
      {subtext && (
        <div style={{ marginTop: 6, fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontFamily: 'var(--font-sans)' }}>
          {subtext}
        </div>
      )}
    </EnterpriseCard>
  )
}
