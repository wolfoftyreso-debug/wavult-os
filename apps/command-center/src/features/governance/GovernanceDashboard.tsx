// ─── Governance Register — Wavult Group ─────────────────────────────────────
// Enterprise ownership-enforcement dashboard.
// INGENTING saknar ägare, referenskod eller status.

import React, { useState, useMemo } from 'react'
import { Shield, ChevronDown, ChevronRight, AlertTriangle, Clock, CheckCircle2, Circle, Loader2, User } from 'lucide-react'
import {
  GOVERNANCE_REGISTRY,
  getCompletionStats,
  isOverdue,
  isDueWithinDays,
  getItemsByOwner,
} from '../../shared/governance/governanceRegistry'
import {
  OWNERS,
  DOMAIN_META,
  validateGovernanceItem,
} from '../../shared/governance/ownershipTypes'
import type { GovernanceItem, RoleId, DomainCode } from '../../shared/governance/ownershipTypes'

// ─── Status helpers ───────────────────────────────────────────────────────────

function statusLabel(status: GovernanceItem['status']): string {
  switch (status) {
    case 'not_started': return 'Ej startad'
    case 'in_progress': return 'Pågående'
    case 'blocked':     return 'Blockerad'
    case 'completed':   return 'Klar'
  }
}

function StatusBadge({ status }: { status: GovernanceItem['status'] }) {
  const base = 'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full'
  switch (status) {
    case 'completed':
      return (
        <span className={base} style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)' }}>
          <CheckCircle2 size={11} /> Klar
        </span>
      )
    case 'in_progress':
      return (
        <span className={base} style={{ background: 'var(--color-info-bg)', color: 'var(--color-info)' }}>
          <Loader2 size={11} /> Pågående
        </span>
      )
    case 'blocked':
      return (
        <span className={base} style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}>
          <AlertTriangle size={11} /> Blockerad
        </span>
      )
    case 'not_started':
      return (
        <span className={base} style={{ background: 'var(--color-neutral-bg)', color: 'var(--color-neutral)' }}>
          <Circle size={11} /> Ej startad
        </span>
      )
  }
}

// ─── Deadline urgency ─────────────────────────────────────────────────────────

function deadlineUrgency(item: GovernanceItem): 'overdue' | 'soon' | 'ok' {
  if (item.status === 'completed') return 'ok'
  if (isOverdue(item)) return 'overdue'
  if (isDueWithinDays(item, 30)) return 'soon'
  return 'ok'
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('sv-SE', {
      year: 'numeric', month: 'short', day: 'numeric',
    })
  } catch {
    return iso
  }
}

// ─── Single governance row ────────────────────────────────────────────────────

function GovernanceRow({ item }: { item: GovernanceItem }) {
  const [expanded, setExpanded] = useState(false)
  const urgency = deadlineUrgency(item)
  const owner = OWNERS[item.owner]

  // Validate — block rendering if invalid
  const errors = validateGovernanceItem(item)
  if (errors.length > 0) {
    return (
      <div style={{
        background: 'var(--color-danger-bg)',
        border: '1px solid var(--color-danger)',
        borderRadius: 'var(--radius-md)',
        padding: '12px 16px',
        marginBottom: 4,
      }}>
        <span style={{ color: 'var(--color-danger)', fontWeight: 600, fontSize: 13 }}>
          ⛔ BLOCKERAD — {item.refCode || 'okänd ref'}
        </span>
        <ul style={{ marginTop: 4, paddingLeft: 16, fontSize: 12 }}>
          {errors.map((e, i) => <li key={i} style={{ color: 'var(--color-danger)' }}>{e}</li>)}
        </ul>
      </div>
    )
  }

  const rowBg =
    urgency === 'overdue' ? 'var(--color-danger-bg)' :
    urgency === 'soon'    ? 'var(--color-warning-bg)' :
    'var(--color-surface)'

  const rowBorder =
    urgency === 'overdue' ? 'var(--color-danger)' :
    urgency === 'soon'    ? 'var(--color-warning)' :
    'var(--color-border)'

  return (
    <div style={{
      background: rowBg,
      border: `1px solid ${rowBorder}`,
      borderRadius: 'var(--radius-md)',
      marginBottom: 4,
      transition: 'box-shadow 0.15s',
    }}>
      {/* Main row */}
      <button
        onClick={() => setExpanded(v => !v)}
        style={{
          display: 'grid',
          gridTemplateColumns: '180px 1fr 120px 180px 100px 20px',
          gap: 12,
          width: '100%',
          padding: '10px 16px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          alignItems: 'center',
          textAlign: 'left',
        }}
      >
        {/* Ref code */}
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--text-xs)',
          color: 'var(--color-text-secondary)',
          letterSpacing: '0.02em',
          whiteSpace: 'nowrap',
        }}>
          {item.refCode}
        </span>

        {/* Title */}
        <span style={{
          fontSize: 'var(--text-sm)',
          color: 'var(--color-text-primary)',
          fontWeight: 'var(--font-medium)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {item.title}
        </span>

        {/* Status */}
        <div>
          <StatusBadge status={item.status} />
        </div>

        {/* Owner */}
        <span style={{
          fontSize: 'var(--text-xs)',
          color: 'var(--color-text-secondary)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {owner?.roleName}
        </span>

        {/* Deadline */}
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--text-xs)',
          color: urgency === 'overdue' ? 'var(--color-danger)' :
                 urgency === 'soon'    ? 'var(--color-warning)' :
                 'var(--color-text-muted)',
          whiteSpace: 'nowrap',
        }}>
          {formatDate(item.deadline)}
        </span>

        {/* Expand chevron */}
        <span style={{ color: 'var(--color-text-muted)' }}>
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div style={{
          padding: '0 16px 14px',
          borderTop: `1px solid ${rowBorder}`,
          marginTop: 2,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
        }}>
          {/* Left col */}
          <div>
            <DetailRow label="Beskrivning" value={item.description} multiline />
            <DetailRow label="Nästa handling" value={item.nextAction} highlight />
            <DetailRow label="Fastställd av" value={`${item.establishedBy} (${formatDate(item.establishedAt)})`} />
          </div>

          {/* Right col */}
          <div>
            <DetailRow label="Ägare (roll)" value={owner?.roleName ?? '—'} />
            <DetailRow label="Ägare (person)" value={owner?.personName ?? '—'} />
            <DetailRow label="E-post" value={owner?.email ?? '—'} />
            {item.blockedBy && (
              <DetailRow label="Blockerad av" value={item.blockedBy} danger />
            )}
            {item.linkedItems.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                  LÄNKADE ITEMS
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                  {item.linkedItems.map(ref => (
                    <span key={ref} style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 'var(--text-xs)',
                      background: 'var(--color-brand-light)',
                      color: 'var(--color-brand)',
                      padding: '2px 6px',
                      borderRadius: 'var(--radius-sm)',
                    }}>
                      {ref}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function DetailRow({
  label,
  value,
  multiline,
  highlight,
  danger,
}: {
  label: string
  value: string
  multiline?: boolean
  highlight?: boolean
  danger?: boolean
}) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{
        fontSize: 'var(--text-xs)',
        color: 'var(--color-text-muted)',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginBottom: 2,
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 'var(--text-sm)',
        color: danger ? 'var(--color-danger)' :
               highlight ? 'var(--color-brand)' :
               'var(--color-text-primary)',
        fontWeight: highlight ? 600 : 400,
        lineHeight: multiline ? 1.5 : 1.3,
      }}>
        {value}
      </div>
    </div>
  )
}

// ─── Blocked items section ────────────────────────────────────────────────────

function BlockedSection({ items }: { items: GovernanceItem[] }) {
  if (items.length === 0) return null
  return (
    <div style={{
      marginBottom: 32,
      background: 'var(--color-danger-bg)',
      border: '2px solid var(--color-danger)',
      borderRadius: 'var(--radius-lg)',
      padding: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <AlertTriangle size={16} color="var(--color-danger)" />
        <span style={{
          fontSize: 'var(--text-sm)',
          fontWeight: 700,
          color: 'var(--color-danger)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>
          Blockerade items ({items.length})
        </span>
      </div>
      <div>
        {items.map(item => (
          <div key={item.refCode} style={{
            background: 'white',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            marginBottom: 6,
            border: '1px solid var(--color-danger)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                  {item.refCode}
                </span>
                <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', marginTop: 2 }}>{item.title}</div>
                {item.blockedBy && (
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-danger)', marginTop: 4 }}>
                    Blockerad av: <span style={{ fontFamily: 'var(--font-mono)' }}>{item.blockedBy}</span>
                  </div>
                )}
              </div>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                {OWNERS[item.owner]?.roleName}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Owner view ───────────────────────────────────────────────────────────────

function OwnerView({ ownerId, onClose }: { ownerId: RoleId; onClose: () => void }) {
  const owner = OWNERS[ownerId]
  const items = getItemsByOwner(ownerId)

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.4)',
      zIndex: 100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-lg)',
          padding: 24,
          width: 'min(720px, 95vw)',
          maxHeight: '85vh',
          overflowY: 'auto',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--color-border)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <User size={16} color="var(--color-brand)" />
              <span style={{ fontWeight: 700, fontSize: 'var(--text-lg)', color: 'var(--color-text-primary)' }}>
                {owner.roleName}
              </span>
            </div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
              {owner.personName} · {owner.email}
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 4 }}>
              {items.length} governance-items · sorterat på deadline
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--color-text-muted)', padding: 4 }}
          >
            ×
          </button>
        </div>

        <div>
          {items.map(item => (
            <GovernanceRow key={item.refCode} item={item} />
          ))}
          {items.length === 0 && (
            <div style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '32px 0' }}>
              Inga governance-items för denna roll
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Filter panel ─────────────────────────────────────────────────────────────

interface Filters {
  domain: DomainCode | 'ALL'
  owner: RoleId | 'ALL'
  status: GovernanceItem['status'] | 'ALL'
}

function FilterPanel({
  filters,
  onChange,
}: {
  filters: Filters
  onChange: (f: Filters) => void
}) {
  const selectStyle: React.CSSProperties = {
    fontSize: 'var(--text-xs)',
    padding: '5px 10px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    background: 'var(--color-surface)',
    color: 'var(--color-text-primary)',
    cursor: 'pointer',
    outline: 'none',
  }

  return (
    <div style={{
      display: 'flex',
      gap: 8,
      flexWrap: 'wrap',
      alignItems: 'center',
      marginBottom: 16,
    }}>
      {/* Domain filter */}
      <select
        value={filters.domain}
        onChange={e => onChange({ ...filters, domain: e.target.value as Filters['domain'] })}
        style={selectStyle}
      >
        <option value="ALL">Alla domäner</option>
        {DOMAIN_META.map(d => (
          <option key={d.code} value={d.code}>{d.label} ({d.code})</option>
        ))}
      </select>

      {/* Owner filter */}
      <select
        value={filters.owner}
        onChange={e => onChange({ ...filters, owner: e.target.value as Filters['owner'] })}
        style={selectStyle}
      >
        <option value="ALL">Alla ägare</option>
        {Object.values(OWNERS).map(o => (
          <option key={o.roleId} value={o.roleId}>{o.roleName}</option>
        ))}
      </select>

      {/* Status filter */}
      <select
        value={filters.status}
        onChange={e => onChange({ ...filters, status: e.target.value as Filters['status'] })}
        style={selectStyle}
      >
        <option value="ALL">Alla statusar</option>
        <option value="not_started">Ej startad</option>
        <option value="in_progress">Pågående</option>
        <option value="blocked">Blockerad</option>
        <option value="completed">Klar</option>
      </select>

      {/* Reset */}
      {(filters.domain !== 'ALL' || filters.owner !== 'ALL' || filters.status !== 'ALL') && (
        <button
          onClick={() => onChange({ domain: 'ALL', owner: 'ALL', status: 'ALL' })}
          style={{
            fontSize: 'var(--text-xs)',
            padding: '5px 10px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            background: 'var(--color-bg-muted)',
            color: 'var(--color-text-secondary)',
            cursor: 'pointer',
          }}
        >
          Återställ filter
        </button>
      )}
    </div>
  )
}

// ─── Column header ────────────────────────────────────────────────────────────

function ColumnHeader() {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '180px 1fr 120px 180px 100px 20px',
      gap: 12,
      padding: '6px 16px',
      marginBottom: 4,
    }}>
      {['REFERENSKOD', 'TITEL', 'STATUS', 'ÄGARE (ROLL)', 'DEADLINE', ''].map((h, i) => (
        <span key={i} style={{
          fontSize: 10,
          fontWeight: 700,
          color: 'var(--color-text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          fontFamily: h === 'REFERENSKOD' ? 'var(--font-mono)' : 'var(--font-sans)',
        }}>
          {h}
        </span>
      ))}
    </div>
  )
}

// ─── Owner chips ──────────────────────────────────────────────────────────────

function OwnerChips({ onSelect }: { onSelect: (id: RoleId) => void }) {
  return (
    <div style={{
      display: 'flex',
      gap: 8,
      flexWrap: 'wrap',
      marginBottom: 20,
    }}>
      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', alignSelf: 'center' }}>
        Vy per ägare:
      </span>
      {Object.values(OWNERS).map(owner => {
        const count = getItemsByOwner(owner.roleId).length
        return (
          <button
            key={owner.roleId}
            onClick={() => onSelect(owner.roleId)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              background: 'var(--color-bg-subtle)',
              cursor: 'pointer',
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-primary)',
              fontWeight: 500,
            }}
          >
            <User size={11} color="var(--color-brand)" />
            {owner.personName}
            <span style={{
              background: 'var(--color-brand-light)',
              color: 'var(--color-brand)',
              borderRadius: 'var(--radius-sm)',
              padding: '0 5px',
              fontSize: 10,
              fontWeight: 700,
            }}>
              {count}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ─── Main dashboard ───────────────────────────────────────────────────────────

export function GovernanceDashboard() {
  const [filters, setFilters] = useState<Filters>({ domain: 'ALL', owner: 'ALL', status: 'ALL' })
  const [selectedOwner, setSelectedOwner] = useState<RoleId | null>(null)

  const stats = useMemo(() => getCompletionStats(), [])

  const filteredItems = useMemo(() => {
    return GOVERNANCE_REGISTRY.filter(item => {
      if (filters.domain !== 'ALL' && item.domain !== filters.domain) return false
      if (filters.owner !== 'ALL' && item.owner !== filters.owner) return false
      if (filters.status !== 'ALL' && item.status !== filters.status) return false
      return true
    })
  }, [filters])

  const blockedItems = useMemo(
    () => GOVERNANCE_REGISTRY.filter(i => i.status === 'blocked'),
    []
  )

  // Group filtered items by domain
  const grouped = useMemo(() => {
    const map = new Map<DomainCode, GovernanceItem[]>()
    filteredItems.forEach(item => {
      const arr = map.get(item.domain) ?? []
      arr.push(item)
      map.set(item.domain, arr)
    })
    return map
  }, [filteredItems])

  const domainOrder: DomainCode[] = ['GOV', 'FIN', 'LEGAL', 'COMP', 'OPS', 'TECH', 'STRAT', 'HR']

  return (
    <div style={{
      padding: '24px',
      maxWidth: 1200,
      margin: '0 auto',
      fontFamily: 'var(--font-sans)',
      color: 'var(--color-text-primary)',
    }}>
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: 24,
        gap: 16,
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-brand-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Shield size={20} color="var(--color-brand)" />
          </div>
          <div>
            <h1 style={{
              margin: 0,
              fontSize: 'var(--text-xl)',
              fontWeight: 'var(--font-bold)',
              color: 'var(--color-text-primary)',
              lineHeight: 1.2,
            }}>
              Governance Register
            </h1>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
              Wavult Group — ownership-enforcement system
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <Stat label="Totalt" value={stats.total} />
          <Stat label="Klara" value={stats.completed} color="var(--color-success)" />
          <Stat label="Pågående" value={GOVERNANCE_REGISTRY.filter(i => i.status === 'in_progress').length} color="var(--color-info)" />
          <Stat label="Ej startad" value={GOVERNANCE_REGISTRY.filter(i => i.status === 'not_started').length} color="var(--color-neutral)" />

          {/* Completion bar */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <div style={{
              width: 80,
              height: 6,
              borderRadius: 3,
              background: 'var(--color-border)',
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${stats.percentage}%`,
                height: '100%',
                background: 'var(--color-success)',
                borderRadius: 3,
                transition: 'width 0.4s ease',
              }} />
            </div>
            <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
              {stats.percentage}% klar
            </span>
          </div>
        </div>
      </div>

      {/* ── Blocked items section ─────────────────────────────────────────── */}
      <BlockedSection items={blockedItems} />

      {/* ── Owner chips ───────────────────────────────────────────────────── */}
      <OwnerChips onSelect={id => setSelectedOwner(id)} />

      {/* ── Filters ───────────────────────────────────────────────────────── */}
      <FilterPanel filters={filters} onChange={setFilters} />

      {/* ── Results count ─────────────────────────────────────────────────── */}
      {filteredItems.length !== GOVERNANCE_REGISTRY.length && (
        <div style={{
          fontSize: 'var(--text-xs)',
          color: 'var(--color-text-muted)',
          marginBottom: 12,
        }}>
          Visar {filteredItems.length} av {GOVERNANCE_REGISTRY.length} items
        </div>
      )}

      {/* ── Items grouped by domain ───────────────────────────────────────── */}
      {domainOrder.map(domain => {
        const items = grouped.get(domain)
        if (!items || items.length === 0) return null
        const meta = DOMAIN_META.find(d => d.code === domain)
        return (
          <div key={domain} style={{ marginBottom: 28 }}>
            {/* Domain header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 8,
              paddingBottom: 6,
              borderBottom: '1px solid var(--color-border)',
            }}>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-xs)',
                fontWeight: 700,
                color: 'var(--color-brand)',
                background: 'var(--color-brand-light)',
                padding: '2px 7px',
                borderRadius: 'var(--radius-sm)',
              }}>
                WG-{domain}
              </span>
              <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)' }}>
                {meta?.label}
              </span>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                {meta?.description}
              </span>
              <span style={{
                marginLeft: 'auto',
                fontSize: 10,
                color: 'var(--color-text-muted)',
                fontFamily: 'var(--font-mono)',
              }}>
                {items.length} item{items.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Column headers */}
            <ColumnHeader />

            {/* Items */}
            {items.map(item => (
              <GovernanceRow key={item.refCode} item={item} />
            ))}
          </div>
        )
      })}

      {filteredItems.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '48px 0',
          color: 'var(--color-text-muted)',
        }}>
          Inga items matchar filtret
        </div>
      )}

      {/* Urgency legend */}
      <div style={{
        display: 'flex',
        gap: 16,
        marginTop: 24,
        padding: '12px 16px',
        background: 'var(--color-bg-subtle)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border)',
        flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600, alignSelf: 'center' }}>
          FÖRKLARING:
        </span>
        <LegendItem color="var(--color-danger-bg)" border="var(--color-danger)" label="Deadline passerad" />
        <LegendItem color="var(--color-warning-bg)" border="var(--color-warning)" label="Deadline inom 30 dagar" />
        <LegendItem color="var(--color-surface)" border="var(--color-border)" label="Inom tidplan" />
        <span style={{ fontSize: 10, color: 'var(--color-text-muted)', marginLeft: 'auto' }}>
          Klicka på en ägare för att se deras ansvarsposter · Klicka på en rad för att expandera
        </span>
      </div>

      {/* ── Owner view modal ──────────────────────────────────────────────── */}
      {selectedOwner && (
        <OwnerView ownerId={selectedOwner} onClose={() => setSelectedOwner(null)} />
      )}
    </div>
  )
}

// ─── Mini helpers ─────────────────────────────────────────────────────────────

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        fontSize: 'var(--text-xl)',
        fontWeight: 700,
        color: color ?? 'var(--color-text-primary)',
        lineHeight: 1,
      }}>
        {value}
      </div>
      <div style={{ fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </div>
    </div>
  )
}

function LegendItem({ color, border, label }: { color: string; border: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <div style={{
        width: 14,
        height: 14,
        borderRadius: 'var(--radius-sm)',
        background: color,
        border: `1px solid ${border}`,
      }} />
      <span style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>{label}</span>
    </div>
  )
}

// Keep also a statusLabel export for potential external use
export { statusLabel }
