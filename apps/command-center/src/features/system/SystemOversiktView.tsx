// ─── Wavult OS — System Översikt ─────────────────────────────────────────────
// Komplett realtidsöversikt: ECS, Cloudflare, Gitea, Migration, Åtgärder
// Synlig bara för group-ceo, cto, admin

import React, { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  Server, Globe, GitBranch, CheckSquare, Square, RefreshCw,
  AlertTriangle, ExternalLink, ChevronDown, Play, Shield,
  Activity, Clock, Zap,
} from 'lucide-react'
import { useRole } from '../../shared/auth/RoleContext'
import { useAuth } from '../../shared/auth/AuthContext'
import { useGiteaRepos } from '../git/useGiteaRepos'

// ─── Constants ────────────────────────────────────────────────────────────────

const API = import.meta.env.VITE_API_URL ?? 'https://api.wavult.com'

const ECS_SERVICES = [
  { name: 'wavult-core',    label: 'Wavult Core API',      critical: true,  deprecated: false },
  { name: 'wavult-os-api',  label: 'Wavult OS API',        critical: true,  deprecated: false },
  { name: 'quixzoom-api',   label: 'quiXzoom API',         critical: true,  deprecated: false },
  { name: 'identity-core',  label: 'Identity Core',        critical: true,  deprecated: false },
  { name: 'gitea',          label: 'Gitea',                critical: true,  deprecated: false },
  { name: 'n8n',            label: 'n8n Automationer',     critical: false, deprecated: false },
  { name: 'wavult-redis',   label: 'Redis Cache',          critical: false, deprecated: false },
  { name: 'wavult-kafka',   label: 'Kafka',                critical: false, deprecated: false },
  { name: 'bos-scheduler',  label: 'BOS Scheduler',        critical: false, deprecated: false },
  { name: 'landvex-api',    label: 'LandveX API',          critical: false, deprecated: false },
  { name: 'team-pulse',     label: 'Team Pulse',           critical: false, deprecated: false },
  { name: 'supabase',       label: 'Supabase (STÄNGS AV)', critical: false, deprecated: true  },
] as const

const MIGRATION_CHECKLIST = [
  { id: 'frontend-auth',        label: 'Frontend Auth → wavult-core',              done: true },
  { id: 'frontend-finance',     label: 'Finance hooks → wavult-core',              done: true },
  { id: 'frontend-crm',         label: 'CRM hooks → wavult-core',                  done: true },
  { id: 'frontend-corporate',   label: 'Corporate hooks → statisk/wavult-core',    done: true },
  { id: 'frontend-submissions', label: 'SubmissionsView → wavult-core',            done: true },
  { id: 'frontend-teammap',     label: 'TeamMap → wavult-core',                    done: true },
  { id: 'frontend-bostasks',    label: 'BosTasks → wavult-core',                   done: true },
  { id: 'frontend-identity',    label: 'WavultIDView → wavult-core',               done: true },
  { id: 'backend-auth',         label: 'Backend supabase_client borttagen',        done: false },
  { id: 'ecs-supabase-off',     label: 'Supabase ECS desired=0',                   done: true },
  { id: 'github-deleted',       label: 'GitHub-repos raderade',                    done: false },
  { id: 'gitea-all-pushed',     label: 'Alla repos pushade till Gitea',            done: false },
]

const GITHUB_REPOS_REMAINING = [
  'wolfoftyreso-debug/hypbit',
  'wolfoftyreso-debug/quixzoom-v2',
  'wolfoftyreso-debug/evasvensson-site',
]

// ─── Types ────────────────────────────────────────────────────────────────────

interface EcsService {
  name: string
  running: number
  desired: number
  status: 'running' | 'pending' | 'stopped'
}

interface CfZone {
  id: string
  name: string
  status: 'active' | 'pending' | 'moved' | 'deleted'
  name_servers: string[]
  dns_records_count?: number
}

// ─── Design tokens ────────────────────────────────────────────────────────────

const C = {
  bg:       '#F5F0E8',
  surface:  '#FDFAF5',
  border:   'rgba(10,61,98,.1)',
  text:     '#0A3D62',
  textMute: '#6B7280',
  green:    '#10B981',
  red:      '#EF4444',
  yellow:   '#F59E0B',
  gray:     '#9CA3AF',
  blue:     '#2563EB',
  orange:   '#F97316',
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ icon, title, count }: { icon: React.ReactNode; title: string; count?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
      <div style={{ color: C.blue }}>{icon}</div>
      <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.text, letterSpacing: '0.04em' }}>
        {title}
      </h2>
      {count !== undefined && (
        <span style={{
          marginLeft: 4, padding: '1px 8px', borderRadius: 20,
          background: 'rgba(37,99,235,.1)', color: C.blue,
          fontSize: 11, fontWeight: 700,
        }}>{count}</span>
      )}
    </div>
  )
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: C.surface,
      border: `1px solid ${C.border}`,
      borderRadius: 10,
      padding: '20px',
      ...style,
    }}>
      {children}
    </div>
  )
}

// ─── Section 1: ECS Services ─────────────────────────────────────────────────

function EcsSection({ token }: { token: string | null }) {
  const { data, isLoading, isError } = useQuery<EcsService[]>({
    queryKey: ['ecs-status'],
    queryFn: async () => {
      const res = await fetch(`${API}/api/system/ecs-status`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    },
    refetchInterval: 30_000,
    retry: 1,
  })

  // Build merged list: API data + static fallback
  const services = ECS_SERVICES.map(svc => {
    const live = data?.find(d => d.name === svc.name)
    return {
      ...svc,
      running: live?.running ?? null,
      desired: live?.desired ?? null,
      apiStatus: live?.status ?? null,
    }
  })

  function getColor(svc: typeof services[0]) {
    if (svc.deprecated) return C.gray
    if (svc.running === null) return C.gray
    if (svc.desired === null || svc.desired === 0) return C.gray
    if (svc.running >= svc.desired) return C.green
    return C.red
  }

  function getLabel(svc: typeof services[0]) {
    if (svc.running === null) return 'okänd'
    if (svc.desired === 0) return 'avstängd'
    return `${svc.running}/${svc.desired}`
  }

  return (
    <Card>
      <SectionHeader icon={<Server size={16} />} title="ECS Services" count={services.length} />

      {isError && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12,
          padding: '8px 12px', background: 'rgba(245,158,11,.08)',
          border: '1px solid rgba(245,158,11,.2)', borderRadius: 6,
          fontSize: 12, color: C.yellow,
        }}>
          <AlertTriangle size={13} />
          <span>API ej tillgänglig — visar statisk lista med okänd status</span>
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: 10,
      }}>
        {services.map(svc => {
          const color = getColor(svc)
          return (
            <div key={svc.name} style={{
              padding: '12px 14px',
              borderRadius: 8,
              border: `1px solid ${color}33`,
              background: `${color}08`,
              position: 'relative',
              opacity: svc.deprecated ? 0.6 : 1,
            }}>
              {svc.critical && !svc.deprecated && (
                <div style={{
                  position: 'absolute', top: 8, right: 8,
                  width: 6, height: 6, borderRadius: '50%',
                  background: color,
                  boxShadow: color === C.green ? `0 0 6px ${color}` : undefined,
                }} />
              )}
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: color,
                marginBottom: 8,
                boxShadow: color === C.green ? `0 0 8px ${color}99` : undefined,
              }} />
              <div style={{ fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 2 }}>
                {svc.label}
              </div>
              <div style={{ fontSize: 11, color: C.textMute }}>
                {svc.deprecated ? '🚫 deprecated' : getLabel(svc)}
              </div>
              {svc.critical && (
                <div style={{
                  marginTop: 4, fontSize: 10, color: C.blue,
                  fontWeight: 700, letterSpacing: '0.05em',
                }}>KRITISK</div>
              )}
            </div>
          )
        })}
      </div>

      {isLoading && (
        <div style={{ textAlign: 'center', color: C.textMute, fontSize: 12, marginTop: 12 }}>
          Hämtar live-status…
        </div>
      )}
    </Card>
  )
}

// ─── Section 2: Cloudflare Domains ───────────────────────────────────────────

function CfSection({ token }: { token: string | null }) {
  const { data, isLoading, isError } = useQuery<CfZone[]>({
    queryKey: ['cf-zones'],
    queryFn: async () => {
      const res = await fetch(`${API}/api/system/cf-zones`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    },
    refetchInterval: 30_000,
    retry: 1,
  })

  function statusColor(status: string) {
    if (status === 'active') return C.green
    if (status === 'pending') return C.yellow
    return C.red
  }

  function statusLabel(status: string) {
    if (status === 'active') return '● Aktiv'
    if (status === 'pending') return '◔ Väntande'
    return '✕ Fel'
  }

  return (
    <Card>
      <SectionHeader icon={<Globe size={16} />} title="Cloudflare Domäner" count={data?.length} />

      {isError && (
        <div style={{
          padding: '16px', textAlign: 'center', color: C.textMute, fontSize: 13,
          border: `1px dashed ${C.border}`, borderRadius: 8,
        }}>
          Kunde inte hämta CF-zoner. API otillgängligt.
        </div>
      )}

      {isLoading && (
        <div style={{ textAlign: 'center', color: C.textMute, fontSize: 12 }}>
          Hämtar domäner…
        </div>
      )}

      {data && data.length === 0 && (
        <div style={{ textAlign: 'center', color: C.textMute, fontSize: 13, padding: 20 }}>
          Inga domäner hittades.
        </div>
      )}

      {data && data.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {['Domän', 'Status', 'Namnservrar', 'DNS-records'].map(h => (
                  <th key={h} style={{
                    textAlign: 'left', padding: '8px 10px',
                    color: C.textMute, fontWeight: 600, letterSpacing: '0.04em',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map(zone => (
                <tr key={zone.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: '10px 10px', fontWeight: 600, color: C.text }}>
                    {zone.name}
                  </td>
                  <td style={{ padding: '10px 10px' }}>
                    <span style={{
                      color: statusColor(zone.status),
                      fontWeight: 700,
                      fontSize: 11,
                    }}>
                      {statusLabel(zone.status)}
                    </span>
                  </td>
                  <td style={{ padding: '10px 10px', color: C.textMute }}>
                    {zone.name_servers?.join(', ') || '—'}
                  </td>
                  <td style={{ padding: '10px 10px', color: C.textMute }}>
                    {zone.dns_records_count ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

// ─── Section 3: Gitea Repos ───────────────────────────────────────────────────

function GiteaSection() {
  const { data: repos, isLoading, isError } = useGiteaRepos()

  const empty = repos?.filter(r => r.empty) ?? []
  const withCode = repos?.filter(r => !r.empty) ?? []
  const live = repos?.filter(r => r.topics?.includes('status-live')) ?? []
  const dev = repos?.filter(r => r.topics?.includes('status-dev')) ?? []
  const archive = repos?.filter(r => r.topics?.includes('status-archive')) ?? []

  function tagColor(tag: string) {
    if (tag === 'status-live') return C.green
    if (tag === 'status-dev') return C.blue
    if (tag === 'status-archive') return C.gray
    return 'rgba(10,61,98,.3)'
  }

  return (
    <Card>
      <SectionHeader icon={<GitBranch size={16} />} title="Gitea Repos" count={repos?.length} />

      {isError && (
        <div style={{
          padding: '16px', textAlign: 'center', color: C.textMute, fontSize: 13,
          border: `1px dashed ${C.border}`, borderRadius: 8,
        }}>
          Kunde inte nå Gitea API. Kontrollera token/URL.
        </div>
      )}

      {isLoading && (
        <div style={{ textAlign: 'center', color: C.textMute, fontSize: 12 }}>
          Hämtar repos…
        </div>
      )}

      {repos && (
        <>
          <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
            {[
              { label: 'Totalt', value: repos.length, color: C.blue },
              { label: 'Med kod', value: withCode.length, color: C.text },
              { label: '⚠️ Tomma', value: empty.length, color: C.red },
              { label: '🟢 Live', value: live.length, color: C.green },
              { label: '🔵 Dev', value: dev.length, color: C.blue },
              { label: '⬜ Arkiv', value: archive.length, color: C.gray },
            ].map(stat => (
              <div key={stat.label} style={{
                padding: '8px 14px', borderRadius: 8,
                background: `${stat.color}10`,
                border: `1px solid ${stat.color}33`,
              }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: stat.color }}>{stat.value}</div>
                <div style={{ fontSize: 11, color: C.textMute }}>{stat.label}</div>
              </div>
            ))}
          </div>

          <div style={{
            maxHeight: 300, overflowY: 'auto',
            display: 'grid', gap: 6,
          }}>
            {repos.map(repo => {
              const isLive = repo.topics?.includes('status-live')
              const isDev = repo.topics?.includes('status-dev')
              const isArchive = repo.topics?.includes('status-archive')
              const tag = isLive ? 'status-live' : isDev ? 'status-dev' : isArchive ? 'status-archive' : null

              return (
                <div key={repo.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px', borderRadius: 7,
                  background: repo.empty ? 'rgba(239,68,68,.05)' : 'transparent',
                  border: repo.empty ? `1px solid ${C.red}22` : `1px solid transparent`,
                }}>
                  <a
                    href={repo.html_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      flex: 1, fontSize: 12, fontWeight: 600, color: C.text,
                      textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6,
                    }}
                  >
                    {repo.empty && <AlertTriangle size={12} color={C.red} />}
                    {repo.name}
                    <ExternalLink size={10} color={C.textMute} />
                  </a>
                  {repo.empty && (
                    <span style={{ fontSize: 10, color: C.red, fontWeight: 700 }}>TOM</span>
                  )}
                  {tag && (
                    <span style={{
                      fontSize: 10, padding: '2px 7px', borderRadius: 10,
                      background: `${tagColor(tag)}22`, color: tagColor(tag),
                      fontWeight: 700,
                    }}>
                      {tag.replace('status-', '')}
                    </span>
                  )}
                  {repo.language && (
                    <span style={{ fontSize: 10, color: C.textMute }}>{repo.language}</span>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </Card>
  )
}

// ─── Section 4: Migration Status ─────────────────────────────────────────────

function MigrationSection() {
  const done = MIGRATION_CHECKLIST.filter(i => i.done).length
  const total = MIGRATION_CHECKLIST.length
  const pct = Math.round((done / total) * 100)

  return (
    <Card>
      <SectionHeader icon={<CheckSquare size={16} />} title="Migration: Supabase → Wavult Core" />

      {/* Progress bar */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: C.textMute }}>Progress</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: pct === 100 ? C.green : C.blue }}>
            {done}/{total} ({pct}%)
          </span>
        </div>
        <div style={{
          height: 8, background: `${C.border}`,
          borderRadius: 4, overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', width: `${pct}%`,
            background: pct === 100 ? C.green : C.blue,
            borderRadius: 4,
            transition: 'width 0.5s ease',
          }} />
        </div>
      </div>

      {/* Checklist */}
      <div style={{ display: 'grid', gap: 6 }}>
        {MIGRATION_CHECKLIST.map(item => (
          <div key={item.id} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '7px 10px', borderRadius: 7,
            background: item.done ? 'rgba(16,185,129,.05)' : 'rgba(107,114,128,.04)',
            opacity: item.done ? 1 : 0.85,
          }}>
            {item.done
              ? <CheckSquare size={15} color={C.green} />
              : <Square size={15} color={C.gray} />
            }
            <span style={{
              fontSize: 12, color: item.done ? C.text : C.textMute,
              fontWeight: item.done ? 500 : 400,
              textDecoration: item.done ? 'none' : 'none',
            }}>
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </Card>
  )
}

// ─── Section 5: GitHub → Gitea ───────────────────────────────────────────────

function GitHubSection() {
  return (
    <Card>
      <SectionHeader icon={<GitBranch size={16} />} title="GitHub → Gitea Migration" count={GITHUB_REPOS_REMAINING.length} />

      <div style={{
        padding: '10px 14px', marginBottom: 14,
        background: 'rgba(245,158,11,.08)',
        border: `1px solid rgba(245,158,11,.25)`,
        borderRadius: 8, fontSize: 12, color: '#92400e',
        display: 'flex', gap: 8, alignItems: 'flex-start',
      }}>
        <AlertTriangle size={14} style={{ marginTop: 1, flexShrink: 0 }} />
        <div>
          <strong>Åtgärd krävs:</strong> För att radera GitHub-repos behövs token med{' '}
          <code style={{ background: 'rgba(0,0,0,.08)', padding: '1px 5px', borderRadius: 3 }}>
            delete_repo
          </code>{' '}
          scope.{' '}
          <a
            href="https://github.com/settings/tokens"
            target="_blank"
            rel="noreferrer"
            style={{ color: C.blue, fontWeight: 600 }}
          >
            github.com/settings/tokens →
          </a>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 6 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.textMute, marginBottom: 4, letterSpacing: '0.05em' }}>
          REPOS KVAR PÅ GITHUB
        </div>
        {GITHUB_REPOS_REMAINING.map(repo => (
          <div key={repo} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 12px', borderRadius: 7,
            border: `1px solid ${C.border}`,
            background: C.surface,
          }}>
            <AlertTriangle size={13} color={C.yellow} />
            <a
              href={`https://github.com/${repo}`}
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: 12, color: C.text, fontWeight: 600, textDecoration: 'none', flex: 1 }}
            >
              {repo}
            </a>
            <ExternalLink size={11} color={C.textMute} />
          </div>
        ))}
      </div>
    </Card>
  )
}

// ─── Section 6: Snabbåtgärder ─────────────────────────────────────────────────

const ACTION_SERVICES = ECS_SERVICES.filter(s => !s.deprecated).map(s => s.name)

function ActionsSection({ token }: { token: string | null }) {
  const [selectedService, setSelectedService] = useState<string>(ACTION_SERVICES[0])
  const [selectedDomain, setSelectedDomain] = useState('wavult.com')
  const [confirmAction, setConfirmAction] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: async ({ action, target }: { action: string; target: string }) => {
      const res = await fetch(`${API}/api/system/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ action, target }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    },
    onSuccess: (_data, vars) => {
      setLastResult(`✅ ${vars.action} på ${vars.target} skickades`)
      setConfirmAction(null)
      setTimeout(() => setLastResult(null), 5000)
    },
    onError: (err, vars) => {
      setLastResult(`❌ Fel vid ${vars.action}: ${err instanceof Error ? err.message : 'okänt'}`)
      setConfirmAction(null)
      setTimeout(() => setLastResult(null), 8000)
    },
  })

  function handleAction(action: string, target: string) {
    if (confirmAction === `${action}:${target}`) {
      mutation.mutate({ action, target })
    } else {
      setConfirmAction(`${action}:${target}`)
    }
  }

  const DOMAINS = ['wavult.com', 'quixzoom.com', 'hypbit.com', 'evasvensson.se']

  return (
    <Card>
      <SectionHeader icon={<Zap size={16} />} title="Snabbåtgärder" />

      {lastResult && (
        <div style={{
          marginBottom: 14, padding: '8px 14px', borderRadius: 8,
          background: lastResult.startsWith('✅') ? 'rgba(16,185,129,.1)' : 'rgba(239,68,68,.1)',
          fontSize: 12, color: C.text,
          border: `1px solid ${lastResult.startsWith('✅') ? C.green : C.red}33`,
        }}>
          {lastResult}
        </div>
      )}

      <div style={{ display: 'grid', gap: 16 }}>
        {/* Starta om ECS-tjänst */}
        <div style={{
          padding: '14px 16px', borderRadius: 8,
          border: `1px solid ${C.border}`, background: C.bg,
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 10 }}>
            Starta om ECS-tjänst
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select
              value={selectedService}
              onChange={e => { setSelectedService(e.target.value); setConfirmAction(null) }}
              style={{
                flex: 1, padding: '7px 10px', borderRadius: 6, fontSize: 12,
                border: `1px solid ${C.border}`, background: C.surface, color: C.text,
              }}
            >
              {ACTION_SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button
              onClick={() => handleAction('restart', selectedService)}
              disabled={mutation.isPending}
              style={{
                padding: '7px 16px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                background: confirmAction === `restart:${selectedService}` ? C.red : C.blue,
                color: '#fff', border: 'none', cursor: 'pointer',
                opacity: mutation.isPending ? 0.6 : 1,
              }}
            >
              {confirmAction === `restart:${selectedService}` ? '⚠️ Bekräfta' : 'Starta om'}
            </button>
          </div>
        </div>

        {/* Tvinga ny deploy */}
        <div style={{
          padding: '14px 16px', borderRadius: 8,
          border: `1px solid ${C.border}`, background: C.bg,
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 10 }}>
            Tvinga ny deploy
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select
              value={selectedService}
              onChange={e => { setSelectedService(e.target.value); setConfirmAction(null) }}
              style={{
                flex: 1, padding: '7px 10px', borderRadius: 6, fontSize: 12,
                border: `1px solid ${C.border}`, background: C.surface, color: C.text,
              }}
            >
              {ACTION_SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button
              onClick={() => handleAction('force-deploy', selectedService)}
              disabled={mutation.isPending}
              style={{
                padding: '7px 16px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                background: confirmAction === `force-deploy:${selectedService}` ? C.red : C.orange,
                color: '#fff', border: 'none', cursor: 'pointer',
                opacity: mutation.isPending ? 0.6 : 1,
              }}
            >
              {confirmAction === `force-deploy:${selectedService}` ? '⚠️ Bekräfta' : 'Deploy'}
            </button>
          </div>
        </div>

        {/* Verifiera CF-zone */}
        <div style={{
          padding: '14px 16px', borderRadius: 8,
          border: `1px solid ${C.border}`, background: C.bg,
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 10 }}>
            Verifiera CF-zone
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select
              value={selectedDomain}
              onChange={e => { setSelectedDomain(e.target.value); setConfirmAction(null) }}
              style={{
                flex: 1, padding: '7px 10px', borderRadius: 6, fontSize: 12,
                border: `1px solid ${C.border}`, background: C.surface, color: C.text,
              }}
            >
              {DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <button
              onClick={() => handleAction('verify-cf-zone', selectedDomain)}
              disabled={mutation.isPending}
              style={{
                padding: '7px 16px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                background: C.green, color: '#fff', border: 'none', cursor: 'pointer',
                opacity: mutation.isPending ? 0.6 : 1,
              }}
            >
              Verifiera
            </button>
          </div>
        </div>
      </div>

      {mutation.isPending && (
        <div style={{ marginTop: 10, textAlign: 'center', fontSize: 12, color: C.textMute }}>
          Skickar åtgärd…
        </div>
      )}
    </Card>
  )
}

// ─── Main View ────────────────────────────────────────────────────────────────

export function SystemOversiktView() {
  const { effectiveRole } = useRole()
  const { getToken } = useAuth()
  const [token, setToken] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const [tick, setTick] = useState(0)

  const roleId = effectiveRole?.id

  // Load token once
  useEffect(() => {
    getToken().then(t => setToken(t ?? null)).catch(() => {})
  }, [getToken])

  // Auto-refresh timestamp every 30s
  useEffect(() => {
    const iv = setInterval(() => {
      setLastUpdated(new Date())
      setTick(t => t + 1)
    }, 30_000)
    return () => clearInterval(iv)
  }, [])

  // Access guard
  const ALLOWED = ['group-ceo', 'cto', 'admin']
  if (!roleId || !ALLOWED.includes(roleId)) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100%', background: C.bg,
      }}>
        <div style={{
          textAlign: 'center', padding: 40,
          background: C.surface, borderRadius: 12,
          border: `1px solid ${C.border}`,
        }}>
          <Shield size={36} color={C.gray} style={{ marginBottom: 12 }} />
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Åtkomst nekad</div>
          <div style={{ fontSize: 12, color: C.textMute, marginTop: 6 }}>
            Denna vy är begränsad till Group CEO, CTO och Admin.
          </div>
        </div>
      </div>
    )
  }

  const fmt = lastUpdated.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  return (
    <div style={{
      minHeight: '100%',
      background: C.bg,
      color: C.text,
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 24px',
        background: C.surface,
        borderBottom: `1px solid ${C.border}`,
        display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
      }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{
            fontSize: 16, fontWeight: 800, color: C.text, letterSpacing: '-0.01em',
          }}>
            Systemöversikt
          </div>
          <div style={{ fontSize: 11, color: C.textMute }}>
            Wavult OS — Realtidsstatus
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Clock size={13} color={C.textMute} />
          <span style={{ fontSize: 11, color: C.textMute }}>
            Senast uppdaterat: <strong style={{ color: C.text }}>{fmt}</strong>
          </span>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '5px 12px', borderRadius: 20,
          background: 'rgba(16,185,129,.1)',
          border: '1px solid rgba(16,185,129,.25)',
        }}>
          <div style={{
            width: 7, height: 7, borderRadius: '50%', background: C.green,
            boxShadow: `0 0 6px ${C.green}`,
          }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: C.green }}>
            AUTO-REFRESH 30s
          </span>
        </div>
      </div>

      {/* Sections */}
      <div style={{ padding: '24px', display: 'grid', gap: 20, maxWidth: 1400 }}>
        <EcsSection token={token} key={`ecs-${tick}`} />
        <CfSection token={token} key={`cf-${tick}`} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 20 }}>
          <MigrationSection />
          <GitHubSection />
        </div>
        <GiteaSection key={`gitea-${tick}`} />
        <ActionsSection token={token} />
      </div>
    </div>
  )
}
