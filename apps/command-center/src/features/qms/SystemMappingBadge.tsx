/**
 * SystemMappingBadge — visar en system-mapping som ett badge
 * [api_route]  /v1/audit/logs  ✅
 * [database]   audit_logs       ✅
 * [infra]      AWS KMS          ⚠️
 */

import React from 'react'
import type { SystemMapping, MappingType, HealthStatus } from './qmsTypes'

const TYPE_LABELS: Record<MappingType, string> = {
  api_route:        'api_route',
  database_table:   'database',
  infra:            'infra',
  policy_doc:       'policy',
  code_file:        'code',
  external_service: 'service',
}

const TYPE_COLORS: Record<MappingType, string> = {
  api_route:        '#0A3D62',
  database_table:   '#1a5276',
  infra:            '#154360',
  policy_doc:       '#7D6608',
  code_file:        '#4A235A',
  external_service: '#784212',
}

const HEALTH_ICON: Record<HealthStatus, string> = {
  healthy:  '✅',
  degraded: '⚠️',
  failing:  '🔴',
  unknown:  '⬜',
}

const HEALTH_COLOR: Record<HealthStatus, string> = {
  healthy:  '#1e8449',
  degraded: '#d68910',
  failing:  '#c0392b',
  unknown:  '#7f8c8d',
}

interface Props {
  mapping: SystemMapping
  onDelete?: (id: string) => void
  compact?: boolean
}

export function SystemMappingBadge({ mapping, onDelete, compact = false }: Props) {
  const typeLabel = TYPE_LABELS[mapping.mapping_type] ?? mapping.mapping_type
  const typeColor = TYPE_COLORS[mapping.mapping_type] ?? '#0A3D62'
  const health    = (mapping.last_health_status ?? 'unknown') as HealthStatus
  const healthIcon  = HEALTH_ICON[health]
  const healthColor = HEALTH_COLOR[health]

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: compact ? '4px 8px' : '8px 12px',
      background: '#FDFAF4',
      border: '1px solid #E2D9C8',
      borderRadius: '6px',
      fontFamily: 'monospace',
      fontSize: compact ? '11px' : '12px',
    }}>
      {/* Type badge */}
      <span style={{
        padding: '2px 6px',
        borderRadius: '4px',
        background: typeColor,
        color: '#fff',
        fontSize: '10px',
        fontWeight: 600,
        letterSpacing: '0.5px',
        whiteSpace: 'nowrap',
      }}>
        {typeLabel}
      </span>

      {/* Label */}
      <span style={{ color: '#0A3D62', fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {mapping.label}
      </span>

      {/* Reference */}
      <span style={{ color: '#5D6D7E', fontSize: compact ? '10px' : '11px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {mapping.reference}
      </span>

      {/* Health */}
      <span title={`Health: ${health}${mapping.last_health_check ? ' — checked ' + new Date(mapping.last_health_check).toLocaleString('sv-SE') : ''}`}
        style={{ color: healthColor, fontSize: '14px', cursor: 'default' }}>
        {healthIcon}
      </span>

      {/* Delete */}
      {onDelete && (
        <button
          onClick={() => onDelete(mapping.id)}
          title="Ta bort mapping"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#c0392b',
            fontSize: '14px',
            padding: '0 2px',
            lineHeight: 1,
          }}
        >
          ×
        </button>
      )}
    </div>
  )
}
