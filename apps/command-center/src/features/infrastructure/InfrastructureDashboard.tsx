// ─── Wavult OS — Infrastructure Operations Center ─────────────────────────────
// WG-TECH-2026-INFRA — Fullständig infrastruktur-dashboard
// Ljust enterprise-tema · Lucide-ikoner · Inga emojis · Inga "AI"

import { useState, useMemo } from 'react'
import {
  Server,
  Database,
  Cloud,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  X,
  Activity,
  CreditCard,
  HardDrive,
  Globe,
  ArrowRight,
  Clock,
  Info,
} from 'lucide-react'
import { SERVICE_REGISTRY, getTotalMonthlyCost, getAllActiveAlerts } from './serviceRegistry'
import { useHealthChecks, mergeStatus, statusLabel } from './useHealthChecks'
import type { ServiceDefinition, ServiceAlert, ServiceStatus, AlertSeverity } from './infraTypes'
import { useTranslation } from '../../shared/i18n/useTranslation'

// ─── Hjälpfunktioner ─────────────────────────────────────────────────────────

function statusColor(status: ServiceStatus): string {
  switch (status) {
    case 'operational': return 'var(--color-success)'
    case 'degraded':    return 'var(--color-warning)'
    case 'down':        return 'var(--color-danger)'
    case 'maintenance': return 'var(--color-info)'
    default:            return 'var(--color-neutral)'
  }
}

function statusBg(status: ServiceStatus): string {
  switch (status) {
    case 'operational': return 'var(--color-success-bg)'
    case 'degraded':    return 'var(--color-warning-bg)'
    case 'down':        return 'var(--color-danger-bg)'
    case 'maintenance': return 'var(--color-info-bg)'
    default:            return 'var(--color-neutral-bg)'
  }
}

function severityColor(sev: AlertSeverity): string {
  switch (sev) {
    case 'critical': return 'var(--color-danger)'
    case 'warning':  return 'var(--color-warning)'
    case 'info':     return 'var(--color-info)'
    default:         return 'var(--color-neutral)'
  }
}

function severityBg(sev: AlertSeverity): string {
  switch (sev) {
    case 'critical': return 'var(--color-danger-bg)'
    case 'warning':  return 'var(--color-warning-bg)'
    case 'info':     return 'var(--color-info-bg)'
    default:         return 'var(--color-neutral-bg)'
  }
}

function categoryIcon(category: ServiceDefinition['category']) {
  const sz = 14
  switch (category) {
    case 'compute':    return <Server size={sz} />
    case 'database':   return <Database size={sz} />
    case 'storage':    return <HardDrive size={sz} />
    case 'cdn':        return <Cloud size={sz} />
    case 'api':        return <Globe size={sz} />
    case 'monitoring': return <Activity size={sz} />
    case 'payment':    return <CreditCard size={sz} />
    default:           return <Shield size={sz} />
  }
}

function providerLabel(provider: ServiceDefinition['provider']): string {
  const labels: Record<string, string> = {
    aws: 'AWS', cloudflare: 'Cloudflare', supabase: 'Supabase',
    github: 'GitHub', stripe: 'Stripe', whoop: 'WHOOP',
    mapbox: 'Mapbox', other: 'Other',
  }
  return labels[provider] ?? provider
}

function critLabel(level: 1 | 2 | 3): string {
  return level === 1 ? 'Kritisk' : level === 2 ? 'Viktig' : 'Lågprio'
}

function formatSEK(n: number): string {
  return n.toLocaleString('sv-SE') + ' SEK'
}

function formatLatency(ms: number | null): string {
  if (ms === null) return '—'
  return `${ms} ms`
}

function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'Just nu'
  if (mins < 60) return `${mins}m sedan`
  return `${Math.floor(mins / 60)}h sedan`
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ServiceStatus }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium font-mono"
      style={{ background: statusBg(status), color: statusColor(status) }}
    >
      {status === 'operational' && <CheckCircle size={10} />}
      {status === 'down'        && <XCircle size={10} />}
      {status === 'degraded'    && <AlertTriangle size={10} />}
      {status === 'maintenance' && <Clock size={10} />}
      {status === 'unknown'     && <Info size={10} />}
      {statusLabel(status)}
    </span>
  )
}

// ─── AlertBadge ──────────────────────────────────────────────────────────────

function AlertBadge({ severity }: { severity: AlertSeverity }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium font-mono"
      style={{ background: severityBg(severity), color: severityColor(severity) }}
    >
      {severity === 'critical' && <XCircle size={10} />}
      {severity === 'warning'  && <AlertTriangle size={10} />}
      {severity === 'info'     && <Info size={10} />}
      {severity.toUpperCase()}
    </span>
  )
}

// ─── Kritisk Service Card ─────────────────────────────────────────────────────

function CriticalServiceCard({
  service,
  checkLatency,
  checkStatus,
  onSelect,
}: {
  service: ServiceDefinition
  checkLatency: number | null | undefined
  checkStatus: ServiceStatus | undefined
  onSelect: (s: ServiceDefinition) => void
}) {
  const effectiveStatus = checkStatus ?? service.status
  const activeAlerts = service.alerts.filter(a => !a.resolvedAt)

  return (
    <button
      onClick={() => onSelect(service)}
      className="w-full text-left rounded-lg border p-4 transition-shadow hover:shadow-md"
      style={{
        background: 'var(--color-surface)',
        borderColor: activeAlerts.length > 0
          ? severityColor(activeAlerts[0].severity)
          : 'var(--color-border)',
        borderLeftWidth: activeAlerts.length > 0 ? 3 : 1,
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span style={{ color: 'var(--color-text-muted)' }}>
            {categoryIcon(service.category)}
          </span>
          <span className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
            {service.name}
          </span>
        </div>
        <StatusBadge status={effectiveStatus} />
      </div>

      {/* Meta grid */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
        <div>
          <span style={{ color: 'var(--color-text-muted)' }}>Provider</span>
          <div className="font-mono font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            {providerLabel(service.provider)}
          </div>
        </div>
        {service.region && (
          <div>
            <span style={{ color: 'var(--color-text-muted)' }}>Region</span>
            <div className="font-mono font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              {service.region}
            </div>
          </div>
        )}
        {checkLatency !== undefined && (
          <div>
            <span style={{ color: 'var(--color-text-muted)' }}>Latency</span>
            <div className="font-mono font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              {formatLatency(checkLatency ?? null)}
            </div>
          </div>
        )}
        {service.uptime30d !== undefined && (
          <div>
            <span style={{ color: 'var(--color-text-muted)' }}>Uptime 30d</span>
            <div className="font-mono font-medium" style={{ color: 'var(--color-success)' }}>
              {service.uptime30d}%
            </div>
          </div>
        )}
        {service.billing && (
          <div>
            <span style={{ color: 'var(--color-text-muted)' }}>Kostnad/mån</span>
            <div className="font-mono font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              {service.billing.monthlyEstimate === 0 ? 'Gratis' : formatSEK(service.billing.monthlyEstimate)}
            </div>
          </div>
        )}
      </div>

      {/* Refcode */}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>
          {service.refCode}
        </span>
        {activeAlerts.length > 0 && (
          <span
            className="text-xs px-1.5 py-0.5 rounded font-mono"
            style={{ background: severityBg(activeAlerts[0].severity), color: severityColor(activeAlerts[0].severity) }}
          >
            {activeAlerts.length} larm
          </span>
        )}
      </div>
    </button>
  )
}

// ─── Service Settings Drawer ──────────────────────────────────────────────────

function ServiceDrawer({
  service,
  onClose,
}: {
  service: ServiceDefinition
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div
        className="h-full w-full max-w-md shadow-xl overflow-y-auto"
        style={{ background: 'var(--color-surface)', borderLeft: '1px solid var(--color-border)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div>
            <div className="flex items-center gap-2">
              <span style={{ color: 'var(--color-text-muted)' }}>{categoryIcon(service.category)}</span>
              <h2 className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>{service.name}</h2>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>{service.refCode}</span>
              <StatusBadge status={service.status} />
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded transition-colors hover:bg-gray-100"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-6">
          {/* Metadata */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>
              Detaljer
            </h3>
            <div className="rounded-lg border divide-y" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-subtle)' }}>
              {[
                ['Kategori', service.category] as [string, string],
                ['Provider', providerLabel(service.provider)] as [string, string],
                service.region ? ['Region', service.region] as [string, string] : null,
                ['Kritikalitet', critLabel(service.criticalityLevel)] as [string, string],
                ['Ägare', service.owner] as [string, string],
                service.uptime30d !== undefined ? ['Uptime 30d', `${service.uptime30d}%`] as [string, string] : null,
                service.endpoint ? ['Endpoint', service.endpoint] as [string, string] : null,
              ].filter((x): x is [string, string] => x !== null).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between px-3 py-2">
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{k}</span>
                  <span className="text-xs font-mono text-right" style={{ color: 'var(--color-text-secondary)' }}>{v}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Settings */}
          {Object.keys(service.settings).length > 0 && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>
                Inställningar
              </h3>
              <div className="rounded-lg border divide-y" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-subtle)' }}>
                {Object.entries(service.settings).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between px-3 py-2 gap-3">
                    <span className="text-xs font-mono flex-shrink-0" style={{ color: 'var(--color-text-muted)' }}>{k}</span>
                    <span
                      className="text-xs font-mono text-right truncate"
                      style={{ color: typeof v === 'boolean' && !v ? 'var(--color-danger)' : 'var(--color-text-secondary)' }}
                    >
                      {String(v)}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Billing */}
          {service.billing && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>
                Fakturering
              </h3>
              <div className="rounded-lg border divide-y" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-subtle)' }}>
                {([
                  ['Leverantör', service.billing.provider],
                  service.billing.accountId ? ['Konto', service.billing.accountId] : null,
                  ['Uppskattning/mån', formatSEK(service.billing.monthlyEstimate)],
                  ['Faktura-e-post', service.billing.billingEmail],
                  service.billing.cardLastFour ? ['Kort', `****${service.billing.cardLastFour}`] : null,
                  service.billing.nextBillingDate ? ['Nästa faktura', service.billing.nextBillingDate] : null,
                  ['Status', service.billing.status],
                ] as ([string, string] | null)[]).filter((x): x is [string, string] => x !== null).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between px-3 py-2">
                    <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{k}</span>
                    <span
                      className="text-xs font-mono"
                      style={{
                        color: k === 'Status' && (v === 'unpaid' || v === 'trial')
                          ? 'var(--color-warning)'
                          : 'var(--color-text-secondary)',
                      }}
                    >
                      {v}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Failover */}
          {service.failover && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>
                Failover-plan
              </h3>
              <div className="rounded-lg border divide-y" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-subtle)' }}>
                {([
                  ['Primary', service.failover.primary],
                  service.failover.secondary ? ['Secondary', service.failover.secondary] : null,
                  service.failover.tertiary ? ['Tertiary', service.failover.tertiary] : null,
                  ['Auto-failover', service.failover.autoFailover ? 'Aktivt' : 'Manuellt'],
                  ['RTO', service.failover.rto],
                  ['RPO', service.failover.rpo],
                ] as ([string, string] | null)[]).filter((x): x is [string, string] => x !== null).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between px-3 py-2">
                    <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{k}</span>
                    <span className="text-xs font-mono" style={{ color: 'var(--color-text-secondary)' }}>{v}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Active Alerts */}
          {service.alerts.filter(a => !a.resolvedAt).length > 0 && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>
                Aktiva larm
              </h3>
              <div className="space-y-2">
                {service.alerts.filter(a => !a.resolvedAt).map(alert => (
                  <div
                    key={alert.id}
                    className="rounded-lg border px-3 py-2"
                    style={{ borderColor: severityColor(alert.severity), background: severityBg(alert.severity) }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <AlertBadge severity={alert.severity} />
                    </div>
                    <p className="text-xs" style={{ color: 'var(--color-text-primary)' }}>{alert.message}</p>
                    <p className="text-xs mt-1 font-mono" style={{ color: 'var(--color-text-muted)' }}>
                      {timeAgo(alert.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Sorterbar tabell ─────────────────────────────────────────────────────────

type SortKey = 'refCode' | 'name' | 'provider' | 'status' | 'region' | 'criticalityLevel' | 'owner' | 'monthly' | 'alerts'
type SortDir = 'asc' | 'desc'

function ServicesTable({
  services,
  checkResults,
  onSelect,
}: {
  services: ServiceDefinition[]
  checkResults: Record<string, import('./infraTypes').HealthCheckResult>
  onSelect: (s: ServiceDefinition) => void
}) {
  const [sortKey, setSortKey] = useState<SortKey>('criticalityLevel')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sorted = useMemo(() => {
    return [...services].sort((a, b) => {
      let av: string | number = 0
      let bv: string | number = 0
      switch (sortKey) {
        case 'refCode':          av = a.refCode; bv = b.refCode; break
        case 'name':             av = a.name; bv = b.name; break
        case 'provider':         av = a.provider; bv = b.provider; break
        case 'status':           av = a.status; bv = b.status; break
        case 'region':           av = a.region ?? ''; bv = b.region ?? ''; break
        case 'criticalityLevel': av = a.criticalityLevel; bv = b.criticalityLevel; break
        case 'owner':            av = a.owner; bv = b.owner; break
        case 'monthly':          av = a.billing?.monthlyEstimate ?? 0; bv = b.billing?.monthlyEstimate ?? 0; break
        case 'alerts':           av = a.alerts.filter(x => !x.resolvedAt).length; bv = b.alerts.filter(x => !x.resolvedAt).length; break
      }
      const cmp = typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number)
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [services, sortKey, sortDir])

  function SortIcon({ k }: { k: SortKey }) {
    if (k !== sortKey) return <span style={{ opacity: 0.3 }}><ChevronUp size={10} /></span>
    return sortDir === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />
  }

  function Th({ label, k }: { label: string; k: SortKey }) {
    return (
      <th
        className="px-3 py-2 text-left text-xs font-semibold cursor-pointer select-none whitespace-nowrap"
        style={{ color: 'var(--color-text-muted)' }}
        onClick={() => toggleSort(k)}
      >
        <span className="inline-flex items-center gap-1">
          {label} <SortIcon k={k} />
        </span>
      </th>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--color-border)' }}>
      <table className="w-full text-sm min-w-[900px]">
        <thead style={{ background: 'var(--color-bg-subtle)', borderBottom: '1px solid var(--color-border)' }}>
          <tr>
            <Th label="RefCode"    k="refCode" />
            <Th label="Tjänst"     k="name" />
            <Th label="Provider"   k="provider" />
            <Th label="Status"     k="status" />
            <Th label="Region"     k="region" />
            <Th label="Krit."      k="criticalityLevel" />
            <Th label="Ägare"      k="owner" />
            <Th label="SEK/mån"    k="monthly" />
            <Th label="Larm"       k="alerts" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((s, i) => {
            const chk = checkResults[s.id]
            const effectiveStatus = chk ? mergeStatus(s.status, chk) : s.status
            const activeAlerts = s.alerts.filter(a => !a.resolvedAt)
            return (
              <tr
                key={s.id}
                className="border-t cursor-pointer transition-colors hover:bg-blue-50"
                style={{ borderColor: 'var(--color-border)', background: i % 2 === 1 ? 'var(--color-bg-subtle)' : 'var(--color-surface)' }}
                onClick={() => onSelect(s)}
              >
                <td className="px-3 py-2">
                  <span className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>{s.refCode}</span>
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <span style={{ color: 'var(--color-text-muted)' }}>{categoryIcon(s.category)}</span>
                    <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{s.name}</span>
                  </div>
                </td>
                <td className="px-3 py-2">
                  <span className="text-xs font-mono" style={{ color: 'var(--color-text-secondary)' }}>{providerLabel(s.provider)}</span>
                </td>
                <td className="px-3 py-2">
                  <StatusBadge status={effectiveStatus} />
                </td>
                <td className="px-3 py-2">
                  <span className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>{s.region ?? '—'}</span>
                </td>
                <td className="px-3 py-2">
                  <span
                    className="text-xs font-mono px-1.5 py-0.5 rounded"
                    style={{
                      background: s.criticalityLevel === 1 ? 'var(--color-danger-bg)' : s.criticalityLevel === 2 ? 'var(--color-warning-bg)' : 'var(--color-neutral-bg)',
                      color: s.criticalityLevel === 1 ? 'var(--color-danger)' : s.criticalityLevel === 2 ? 'var(--color-warning)' : 'var(--color-neutral)',
                    }}
                  >
                    {critLabel(s.criticalityLevel)}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <span className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>{s.owner}</span>
                </td>
                <td className="px-3 py-2">
                  <span className="text-xs font-mono" style={{ color: 'var(--color-text-secondary)' }}>
                    {s.billing?.monthlyEstimate === 0 ? '—' : s.billing ? `${s.billing.monthlyEstimate.toLocaleString('sv-SE')}` : '—'}
                  </span>
                </td>
                <td className="px-3 py-2">
                  {activeAlerts.length > 0 ? (
                    <span
                      className="text-xs font-mono px-1.5 py-0.5 rounded"
                      style={{ background: severityBg(activeAlerts[0].severity), color: severityColor(activeAlerts[0].severity) }}
                    >
                      {activeAlerts.length}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>—</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── Larm-panel ──────────────────────────────────────────────────────────────

function AlertsPanel({ alerts, onAcknowledge }: { alerts: ServiceAlert[]; onAcknowledge: (id: string) => void }) {
  const sorted = useMemo(() =>
    [...alerts].sort((a, b) => {
      const order: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2, resolved: 3 }
      return order[a.severity] - order[b.severity]
    }),
  [alerts])

  if (sorted.length === 0) {
    return (
      <div className="flex items-center gap-2 p-4 rounded-lg border" style={{ borderColor: 'var(--color-border)', background: 'var(--color-success-bg)' }}>
        <CheckCircle size={16} style={{ color: 'var(--color-success)' }} />
        <span className="text-sm font-medium" style={{ color: 'var(--color-success)' }}>
          Inga aktiva larm
        </span>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {sorted.map(alert => (
        <div
          key={alert.id}
          className="rounded-lg border p-3"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <AlertBadge severity={alert.severity} />
                <span className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>
                  {alert.serviceId}
                </span>
              </div>
              <p className="text-xs" style={{ color: 'var(--color-text-primary)' }}>{alert.message}</p>
              <p className="text-xs mt-1 font-mono" style={{ color: 'var(--color-text-muted)' }}>
                {timeAgo(alert.createdAt)}
              </p>
            </div>
            <button
              onClick={() => onAcknowledge(alert.id)}
              className="flex-shrink-0 text-xs px-2 py-1 rounded border transition-colors hover:bg-gray-50"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
            >
              Kvittera
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Betalningsöversikt ───────────────────────────────────────────────────────

function BillingOverview() {
  const withBilling = SERVICE_REGISTRY.filter(s => s.billing)
  const total = getTotalMonthlyCost()
  const unpaidOrTrial = withBilling.filter(s => s.billing?.status === 'unpaid' || s.billing?.status === 'trial')

  return (
    <div className="space-y-3">
      {unpaidOrTrial.length > 0 && (
        <div
          className="flex items-center gap-2 p-3 rounded-lg border"
          style={{ borderColor: 'var(--color-warning)', background: 'var(--color-warning-bg)' }}
        >
          <AlertTriangle size={14} style={{ color: 'var(--color-warning)' }} />
          <span className="text-xs font-medium" style={{ color: 'var(--color-warning)' }}>
            {unpaidOrTrial.length} tjänst(er) kräver faktureringsåtgärd
          </span>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--color-border)' }}>
        <table className="w-full text-sm min-w-[600px]">
          <thead style={{ background: 'var(--color-bg-subtle)', borderBottom: '1px solid var(--color-border)' }}>
            <tr>
              {['Provider', 'Tjänst', 'Konto', 'SEK/mån', 'Status'].map(h => (
                <th key={h} className="px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {withBilling.map((s, i) => (
              <tr
                key={s.id}
                className="border-t"
                style={{ borderColor: 'var(--color-border)', background: i % 2 === 1 ? 'var(--color-bg-subtle)' : 'var(--color-surface)' }}
              >
                <td className="px-3 py-2 text-xs font-mono" style={{ color: 'var(--color-text-secondary)' }}>
                  {providerLabel(s.billing!.provider as ServiceDefinition['provider'])}
                </td>
                <td className="px-3 py-2 text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  {s.name}
                </td>
                <td className="px-3 py-2 text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>
                  {s.billing?.accountId ?? '—'}
                </td>
                <td className="px-3 py-2 text-xs font-mono font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                  {s.billing!.monthlyEstimate === 0 ? 'Gratis' : s.billing!.monthlyEstimate.toLocaleString('sv-SE')}
                </td>
                <td className="px-3 py-2">
                  <span
                    className="text-xs font-mono px-1.5 py-0.5 rounded"
                    style={{
                      background: s.billing!.status === 'active' ? 'var(--color-success-bg)' :
                                  s.billing!.status === 'trial' ? 'var(--color-warning-bg)' :
                                  s.billing!.status === 'unpaid' ? 'var(--color-danger-bg)' :
                                  'var(--color-neutral-bg)',
                      color: s.billing!.status === 'active' ? 'var(--color-success)' :
                             s.billing!.status === 'trial' ? 'var(--color-warning)' :
                             s.billing!.status === 'unpaid' ? 'var(--color-danger)' :
                             'var(--color-neutral)',
                    }}
                  >
                    {s.billing!.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot style={{ borderTop: '2px solid var(--color-border)', background: 'var(--color-bg-muted)' }}>
            <tr>
              <td colSpan={3} className="px-3 py-2 text-xs font-bold" style={{ color: 'var(--color-text-primary)' }}>
                Total / mån
              </td>
              <td className="px-3 py-2 text-sm font-bold font-mono" style={{ color: 'var(--color-text-primary)' }}>
                {total.toLocaleString('sv-SE')} SEK
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

// ─── Failover-karta ───────────────────────────────────────────────────────────

function FailoverMap() {
  const servicesWithFailover = SERVICE_REGISTRY.filter(s => s.failover)

  return (
    <div className="space-y-2">
      {servicesWithFailover.map(s => {
        const fo = s.failover!
        return (
          <div
            key={s.id}
            className="rounded-lg border p-3 font-mono text-xs"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-subtle)' }}
          >
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1">
                <span
                  className="px-1.5 py-0.5 rounded"
                  style={{ background: 'var(--color-info-bg)', color: 'var(--color-info)' }}
                >
                  {fo.primary}
                </span>
                {s.region && <span style={{ color: 'var(--color-text-muted)' }}>({s.region})</span>}
              </div>

              {fo.secondary && (
                <>
                  <div className="flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
                    <ArrowRight size={12} />
                    <span>[{fo.autoFailover ? 'auto-failover' : 'manuell'}]</span>
                    <ArrowRight size={12} />
                  </div>
                  <span
                    className="px-1.5 py-0.5 rounded"
                    style={{ background: 'var(--color-neutral-bg)', color: 'var(--color-neutral)' }}
                  >
                    {fo.secondary}
                  </span>
                </>
              )}

              {!fo.secondary && (
                <div className="flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
                  <ArrowRight size={12} />
                  <span>[{fo.autoFailover ? 'auto-failover' : 'manuell'}]</span>
                  <ArrowRight size={12} />
                  <span>ECS task replacement</span>
                </div>
              )}

              <div className="ml-auto flex items-center gap-2">
                <span style={{ color: 'var(--color-text-muted)' }}>RTO: {fo.rto}</span>
                <span style={{ color: 'var(--color-text-muted)' }}>RPO: {fo.rpo}</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ title, count }: { title: string; count?: number }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
        {title}
      </h2>
      {count !== undefined && (
        <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ background: 'var(--color-neutral-bg)', color: 'var(--color-neutral)' }}>
          {count}
        </span>
      )}
      <div className="flex-1 border-t" style={{ borderColor: 'var(--color-border)' }} />
    </div>
  )
}

// ─── Tab-navigation ───────────────────────────────────────────────────────────

type Tab = 'overview' | 'table' | 'alerts' | 'billing' | 'failover'

function Tabs({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview',  label: 'Oversikt' },
    { id: 'table',     label: 'Alla tjänster' },
    { id: 'alerts',    label: 'Larm' },
    { id: 'billing',   label: 'Fakturering' },
    { id: 'failover',  label: 'Failover' },
  ]

  return (
    <div className="flex gap-1 border-b mb-6" style={{ borderColor: 'var(--color-border)' }}>
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className="px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px"
          style={{
            borderBottomColor: active === t.id ? 'var(--color-brand)' : 'transparent',
            color: active === t.id ? 'var(--color-brand)' : 'var(--color-text-muted)',
            background: 'transparent',
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export function InfrastructureDashboard() {
  const { t: _t } = useTranslation() // ready for i18n
  const { results: checkResults, loading, lastRun, refresh } = useHealthChecks()
  const [selectedService, setSelectedService] = useState<ServiceDefinition | null>(null)
  const [acknowledgedAlerts, setAcknowledgedAlerts] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  // Merge check results into services
  const servicesWithStatus = useMemo(() => {
    return SERVICE_REGISTRY.map(s => ({
      ...s,
      status: checkResults[s.id] ? mergeStatus(s.status, checkResults[s.id]) : s.status,
    }))
  }, [checkResults])

  // Status summary
  const counts = useMemo(() => {
    const c = { operational: 0, degraded: 0, down: 0, unknown: 0, maintenance: 0 }
    servicesWithStatus.forEach(s => { c[s.status] = (c[s.status] ?? 0) + 1 })
    return c
  }, [servicesWithStatus])

  // Critical services (criticalityLevel: 1)
  const criticalServices = useMemo(
    () => servicesWithStatus.filter(s => s.criticalityLevel === 1),
    [servicesWithStatus]
  )

  // All active alerts (minus acknowledged)
  const activeAlerts = useMemo(() =>
    getAllActiveAlerts().filter(a => !acknowledgedAlerts.has(a.id)),
  [acknowledgedAlerts])

  function handleAcknowledge(alertId: string) {
    setAcknowledgedAlerts(prev => new Set([...prev, alertId]))
  }

  const totalMonthly = getTotalMonthlyCost()

  return (
    <div className="h-full overflow-auto" style={{ background: 'var(--color-bg)', color: 'var(--color-text-primary)' }}>
      <div className="max-w-screen-xl mx-auto px-4 md:px-6 py-6">

        {/* ── Page Header ─────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Server size={18} style={{ color: 'var(--color-brand)' }} />
              <h1 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                Infrastructure Operations Center
              </h1>
            </div>
            <p className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>
              Wavult Group · {SERVICE_REGISTRY.length} tjänster registrerade · {totalMonthly.toLocaleString('sv-SE')} SEK/mån
            </p>
          </div>
          <button
            onClick={refresh}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors hover:bg-gray-50 disabled:opacity-50"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Uppdatera</span>
          </button>
        </div>

        {/* ── Status-sammanfattning ────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          {(
            [
              { label: 'Totalt',       value: SERVICE_REGISTRY.length, color: 'var(--color-neutral)',  bg: 'var(--color-neutral-bg)' },
              { label: 'Operational',  value: counts.operational,       color: 'var(--color-success)',  bg: 'var(--color-success-bg)' },
              { label: 'Degraded',     value: counts.degraded,          color: 'var(--color-warning)',  bg: 'var(--color-warning-bg)' },
              { label: 'Down',         value: counts.down,              color: 'var(--color-danger)',   bg: 'var(--color-danger-bg)'  },
              { label: 'Unknown',      value: counts.unknown,           color: 'var(--color-neutral)',  bg: 'var(--color-neutral-bg)' },
            ] as const
          ).map(item => (
            <div
              key={item.label}
              className="rounded-lg border px-4 py-3 text-center"
              style={{ borderColor: 'var(--color-border)', background: item.bg }}
            >
              <div className="text-2xl font-bold font-mono" style={{ color: item.color }}>{item.value}</div>
              <div className="text-xs font-medium mt-0.5" style={{ color: item.color }}>{item.label}</div>
            </div>
          ))}
        </div>

        {/* Last run */}
        {lastRun && (
          <p className="text-xs font-mono mb-4" style={{ color: 'var(--color-text-muted)' }}>
            Senaste kontroll: {timeAgo(lastRun)}
            {activeAlerts.length > 0 && (
              <span className="ml-3" style={{ color: 'var(--color-warning)' }}>
                · {activeAlerts.length} aktiva larm
              </span>
            )}
          </p>
        )}

        {/* ── Tabs ────────────────────────────────────────────────────────── */}
        <Tabs active={activeTab} onChange={setActiveTab} />

        {/* ── Overview: Kritiska tjänster ──────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div>
            <SectionHeader title="Kritiska tjänster" count={criticalServices.length} />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-8">
              {criticalServices.map(s => (
                <CriticalServiceCard
                  key={s.id}
                  service={s}
                  checkLatency={checkResults[s.id]?.latency}
                  checkStatus={checkResults[s.id]?.status}
                  onSelect={setSelectedService}
                />
              ))}
            </div>

            {/* Övriga tjänster (kompakt) */}
            <SectionHeader title="Övriga tjänster" count={SERVICE_REGISTRY.length - criticalServices.length} />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {servicesWithStatus
                .filter(s => s.criticalityLevel > 1)
                .map(s => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedService(s)}
                    className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors hover:bg-gray-50"
                    style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span style={{ color: 'var(--color-text-muted)' }}>{categoryIcon(s.category)}</span>
                      <div className="min-w-0">
                        <div className="text-xs font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>{s.name}</div>
                        <div className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>{s.refCode}</div>
                      </div>
                    </div>
                    <StatusBadge status={s.status} />
                  </button>
                ))}
            </div>
          </div>
        )}

        {/* ── Alla tjänster — tabell ─────────────────────────────────────── */}
        {activeTab === 'table' && (
          <div>
            <SectionHeader title="Alla tjänster" count={SERVICE_REGISTRY.length} />
            <ServicesTable
              services={servicesWithStatus}
              checkResults={checkResults}
              onSelect={setSelectedService}
            />
          </div>
        )}

        {/* ── Larm-panel ──────────────────────────────────────────────────── */}
        {activeTab === 'alerts' && (
          <div>
            <SectionHeader title="Aktiva larm" count={activeAlerts.length} />
            <AlertsPanel alerts={activeAlerts} onAcknowledge={handleAcknowledge} />
          </div>
        )}

        {/* ── Betalningsöversikt ───────────────────────────────────────────── */}
        {activeTab === 'billing' && (
          <div>
            <SectionHeader title="Fakturering" />
            <BillingOverview />
          </div>
        )}

        {/* ── Failover-karta ───────────────────────────────────────────────── */}
        {activeTab === 'failover' && (
          <div>
            <SectionHeader title="Failover-plan" />
            <div
              className="mb-4 p-3 rounded-lg border text-xs font-mono"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-subtle)', color: 'var(--color-text-muted)' }}
            >
              <span className="font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Format:</span>{' '}
              primary (region) → [auto-failover | manuell] → secondary · RTO / RPO
            </div>
            <FailoverMap />
          </div>
        )}

      </div>

      {/* ── Service Settings Drawer ──────────────────────────────────────── */}
      {selectedService && (
        <ServiceDrawer
          service={selectedService}
          onClose={() => setSelectedService(null)}
        />
      )}
    </div>
  )
}
