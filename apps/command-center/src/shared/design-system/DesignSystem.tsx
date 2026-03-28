import { ReactNode } from 'react'
import { AlertTriangle, CheckCircle, Info, X } from 'lucide-react'

// ─── CARD ─────────────────────────────────────────────────────────────────────
// The foundational container. Always bg-white, shadow-sm, rounded-lg

export function Card({ children, className = '', padding = true }: {
  children: ReactNode
  className?: string
  padding?: boolean
}) {
  return (
    <div
      className={`bg-white rounded-xl border ${className}`}
      style={{
        borderColor: 'var(--color-border)',
        boxShadow: 'var(--shadow-sm)',
        padding: padding ? '16px' : undefined,
      }}
    >
      {children}
    </div>
  )
}

// ─── SECTION HEADER ───────────────────────────────────────────────────────────
// Used inside cards or page sections

export function SectionHeader({ label, action }: { label: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <span style={{
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: 'var(--color-text-tertiary)',
        fontFamily: 'var(--font-sans)',
      }}>
        {label}
      </span>
      {action}
    </div>
  )
}

// ─── STATUS BADGE ─────────────────────────────────────────────────────────────

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

const badgeStyles: Record<BadgeVariant, { bg: string; text: string; dot: string }> = {
  success: { bg: 'var(--color-success-bg)', text: 'var(--color-success)', dot: 'var(--color-success)' },
  warning: { bg: 'var(--color-warning-bg)', text: 'var(--color-warning)', dot: 'var(--color-warning)' },
  danger:  { bg: 'var(--color-danger-bg)',  text: 'var(--color-danger)',  dot: 'var(--color-danger)' },
  info:    { bg: 'var(--color-info-bg)',    text: 'var(--color-info)',    dot: 'var(--color-info)' },
  neutral: { bg: 'rgba(0,0,0,0.06)',        text: 'var(--color-text-secondary)', dot: 'var(--color-text-tertiary)' },
}

export function Badge({ label, variant = 'neutral', pulse = false }: {
  label: string
  variant?: BadgeVariant
  pulse?: boolean
}) {
  const s = badgeStyles[variant]
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      padding: '2px 8px',
      borderRadius: 'var(--radius-full)',
      background: s.bg,
      fontSize: 11,
      fontWeight: 600,
      color: s.text,
      fontFamily: 'var(--font-sans)',
    }}>
      <span style={{
        width: 6, height: 6,
        borderRadius: '50%',
        background: s.dot,
        animation: pulse ? 'pulse 2s infinite' : undefined,
      }} />
      {label}
    </span>
  )
}

// ─── BUTTON ───────────────────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

export function Button({ children, variant = 'secondary', onClick, disabled = false, size = 'md' }: {
  children: ReactNode
  variant?: ButtonVariant
  onClick?: () => void
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
}) {
  const styles: Record<ButtonVariant, { bg: string; text: string; border: string }> = {
    primary:   { bg: 'var(--color-accent)',     text: '#FFFFFF',                   border: 'transparent' },
    secondary: { bg: 'var(--color-bg-grouped)', text: 'var(--color-text-primary)', border: 'var(--color-border)' },
    ghost:     { bg: 'transparent',             text: 'var(--color-accent)',        border: 'transparent' },
    danger:    { bg: 'var(--color-danger-bg)',  text: 'var(--color-danger)',        border: 'transparent' },
  }

  const padding = { sm: '4px 10px', md: '8px 16px', lg: '12px 24px' }[size]
  const fontSize = { sm: 12, md: 14, lg: 16 }[size]
  const s = styles[variant]

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding,
        borderRadius: 'var(--radius-md)',
        background: s.bg,
        color: s.text,
        border: `1px solid ${s.border}`,
        fontSize,
        fontWeight: 600,
        fontFamily: 'var(--font-sans)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: 'all var(--transition-fast)',
        outline: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {children}
    </button>
  )
}

// ─── ALERT ────────────────────────────────────────────────────────────────────

export function Alert({ type = 'info', title, message, onDismiss }: {
  type?: 'success' | 'warning' | 'danger' | 'info'
  title: string
  message?: string
  onDismiss?: () => void
}) {
  const icons = { success: CheckCircle, warning: AlertTriangle, danger: AlertTriangle, info: Info }
  const variants: Record<string, BadgeVariant> = { success: 'success', warning: 'warning', danger: 'danger', info: 'info' }
  const Icon = icons[type]
  const s = badgeStyles[variants[type]]

  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 12,
      padding: '12px 16px',
      borderRadius: 'var(--radius-lg)',
      background: s.bg,
      border: `1px solid ${s.dot}22`,
    }}>
      <Icon style={{ width: 16, height: 16, color: s.text, flexShrink: 0, marginTop: 2 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: s.text }}>{title}</div>
        {message && <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>{message}</div>}
      </div>
      {onDismiss && (
        <button onClick={onDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--color-text-tertiary)' }}>
          <X style={{ width: 14, height: 14 }} />
        </button>
      )}
    </div>
  )
}

// ─── METRIC ───────────────────────────────────────────────────────────────────

export function Metric({ label, value, sub, trend }: {
  label: string
  value: string | number
  sub?: string
  trend?: 'up' | 'down' | 'flat'
}) {
  const trendColor = trend === 'up'
    ? 'var(--color-success)'
    : trend === 'down'
    ? 'var(--color-danger)'
    : 'var(--color-text-tertiary)'

  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-tertiary)', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)', letterSpacing: '-0.5px', lineHeight: 1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: trendColor, marginTop: 4, fontWeight: 500 }}>{sub}</div>}
    </div>
  )
}

// ─── LIST ROW ─────────────────────────────────────────────────────────────────

export function ListRow({ label, value, sub, onClick }: {
  label: string
  value?: string | ReactNode
  sub?: string
  onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '11px 16px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'background var(--transition-fast)',
        borderRadius: 'var(--radius-sm)',
      }}
      onMouseEnter={e => onClick && ((e.currentTarget as HTMLDivElement).style.background = 'var(--color-bg-grouped)')}
      onMouseLeave={e => onClick && ((e.currentTarget as HTMLDivElement).style.background = 'transparent')}
    >
      <div>
        <div style={{ fontSize: 15, color: 'var(--color-text-primary)', fontWeight: 400 }}>{label}</div>
        {sub && <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 1 }}>{sub}</div>}
      </div>
      {value && <div style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>{value}</div>}
    </div>
  )
}

// ─── INPUT ────────────────────────────────────────────────────────────────────

export function Input({ placeholder, value, onChange, type = 'text', label }: {
  placeholder?: string
  value?: string
  onChange?: (v: string) => void
  type?: string
  label?: string
}) {
  return (
    <div>
      {label && (
        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
          {label}
        </label>
      )}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange?.(e.target.value)}
        style={{
          width: '100%',
          padding: '10px 14px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border)',
          background: 'var(--color-bg-primary)',
          color: 'var(--color-text-primary)',
          fontSize: 16,
          fontFamily: 'var(--font-sans)',
          outline: 'none',
          transition: 'border-color var(--transition-fast)',
        }}
        onFocus={e => (e.target.style.borderColor = 'var(--color-accent)')}
        onBlur={e => (e.target.style.borderColor = 'var(--color-border)')}
      />
    </div>
  )
}
