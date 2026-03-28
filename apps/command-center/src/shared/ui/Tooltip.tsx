// ─── Tooltip — kontextuell hjälptext ─────────────────────────────────────────
// Används överallt i systemet för att förklara vad saker är.

import { useState, useRef, useEffect } from 'react'

interface TooltipProps {
  content: string
  title?: string
  children?: React.ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
  /** If true, render a standalone ? icon instead of wrapping children */
  asIcon?: boolean
  size?: 'sm' | 'md'
}

export function Tooltip({ content, title, children, position = 'top', asIcon = false, size = 'sm' }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setVisible(false)
      }
    }
    if (visible) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [visible])

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }

  const trigger = asIcon ? (
    <button
      className="inline-flex items-center justify-center rounded-full flex-shrink-0 transition-colors"
      style={{
        width: size === 'sm' ? 14 : 18,
        height: size === 'sm' ? 14 : 18,
        background: visible ? '#6366F130' : '#FFFFFF0A',
        color: visible ? '#6366F1' : '#6B7280',
        border: `1px solid ${visible ? '#6366F140' : '#FFFFFF10'}`,
        fontSize: size === 'sm' ? 8 : 10,
        fontWeight: 700,
        fontFamily: 'monospace',
      }}
      onClick={(e) => { e.stopPropagation(); setVisible(v => !v) }}
      title={title || content}
    >
      ?
    </button>
  ) : (
    <div
      className="cursor-help inline-flex"
      onClick={(e) => { e.stopPropagation(); setVisible(v => !v) }}
    >
      {children}
    </div>
  )

  return (
    <div ref={ref} className="relative inline-flex items-center">
      {trigger}
      {visible && (
        <div
          className={`absolute z-50 w-56 rounded-xl shadow-xl pointer-events-none ${positionClasses[position]}`}
          style={{ background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <div className="p-3">
            {title && (
              <p className="text-xs font-semibold text-white mb-1">{title}</p>
            )}
            <p className="text-xs text-gray-400 leading-relaxed">{content}</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── InfoRow — label + value + optional tooltip ───────────────────────────────

export function InfoRow({
  label,
  value,
  tooltip,
  className = '',
}: {
  label: string
  value: React.ReactNode
  tooltip?: string
  className?: string
}) {
  return (
    <div className={`flex items-center justify-between gap-2 ${className}`}>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span className="text-xs text-gray-600 font-mono">{label}</span>
        {tooltip && <Tooltip content={tooltip} asIcon position="right" />}
      </div>
      <span className="text-xs text-gray-300 text-right">{value}</span>
    </div>
  )
}

// ─── SectionHeader — header with tooltip ─────────────────────────────────────

export function SectionHeader({
  title,
  tooltip,
  className = '',
  children,
}: {
  title: string
  tooltip?: string
  className?: string
  children?: React.ReactNode
}) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider">{title}</h3>
      {tooltip && <Tooltip content={tooltip} asIcon position="right" size="sm" />}
      {children && <div className="ml-auto">{children}</div>}
    </div>
  )
}
