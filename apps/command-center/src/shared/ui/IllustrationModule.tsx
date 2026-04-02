/**
 * IllustrationModule — Shows a scenario illustration for any OS module
 * Usage: <IllustrationModule module="finance" size={80} />
 *        <IllustrationModule scenario={117} size={64} />
 */
import { useState } from 'react'
import { getModuleIllustration, getScenario, SCENARIOS } from '../illustrations'

interface Props {
  module?: string
  scenario?: number
  size?: number
  className?: string
  style?: React.CSSProperties
  fallback?: number
}

export function IllustrationModule({
  module,
  scenario,
  size = 64,
  className = '',
  style = {},
  fallback = 117,
}: Props) {
  const [error, setError] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const url = scenario
    ? getScenario(scenario)
    : module
    ? getModuleIllustration(module, fallback)
    : getScenario(fallback)

  if (error) {
    return (
      <div
        style={{
          width: size,
          height: size,
          background: 'var(--color-accent-subtle, #FAF5E8)',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          ...style,
        }}
        className={className}
      >
        <span style={{ fontSize: size * 0.4, opacity: 0.4 }}>📋</span>
      </div>
    )
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        background: '#F5F0E8',
        borderRadius: 8,
        overflow: 'hidden',
        flexShrink: 0,
        position: 'relative',
        ...style,
      }}
      className={className}
    >
      {!loaded && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'var(--color-bg-muted, #E5DED3)',
            borderRadius: 8,
          }}
        />
      )}
      <img
        src={url}
        alt={module || `scenario ${scenario}`}
        width={size}
        height={size}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        style={{
          objectFit: 'contain',
          padding: size > 48 ? 6 : 4,
          display: loaded ? 'block' : 'none',
          width: '100%',
          height: '100%',
        }}
      />
    </div>
  )
}

// Picker component — browse all 902 illustrations
interface PickerProps {
  onSelect: (scenario: number) => void
  selectedScenario?: number
  seriesFilter?: number
}

export function IllustrationPicker({ onSelect, selectedScenario, seriesFilter }: PickerProps) {
  const [search, setSearch] = useState('')
  const [series, setSeries] = useState<number | null>(seriesFilter ?? null)

  const filtered = SCENARIOS.filter(s => {
    if (series !== null && (s.id < series || s.id >= series + 100)) return false
    if (search && !String(s.id).includes(search)) return false
    return true
  }).slice(0, 200)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          placeholder="Search by number..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1,
            padding: '6px 10px',
            borderRadius: 6,
            border: '1px solid var(--color-border)',
            background: 'var(--color-surface)',
            fontSize: 13,
          }}
        />
        <select
          value={series ?? ''}
          onChange={e => setSeries(e.target.value ? parseInt(e.target.value) : null)}
          style={{
            padding: '6px 10px',
            borderRadius: 6,
            border: '1px solid var(--color-border)',
            background: 'var(--color-surface)',
            fontSize: 13,
          }}
        >
          <option value="">All series</option>
          {[0, 100, 200, 300, 400, 500, 1000, 2000, 3000, 4000, 5000].map(s => (
            <option key={s} value={s}>
              {s}–{s + 99}
            </option>
          ))}
        </select>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))',
          gap: 6,
          maxHeight: 400,
          overflow: 'auto',
        }}
      >
        {filtered.map(s => (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            style={{
              border:
                selectedScenario === s.id
                  ? '2px solid var(--color-accent, #C9A84C)'
                  : '1px solid var(--color-border)',
              borderRadius: 8,
              background:
                selectedScenario === s.id
                  ? 'var(--color-accent-subtle)'
                  : 'var(--color-surface)',
              padding: 4,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <IllustrationModule scenario={s.id} size={56} />
            <span
              style={{
                fontSize: 9,
                color: 'var(--color-text-muted)',
                fontFamily: 'monospace',
              }}
            >
              {s.id}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
