// ─── Wavult Network Map — Full System Topology ───────────────────────────────
// All domains, subdomains, APIs, CDN, tunnels, services — live status.

import React, { useState, useEffect, useCallback } from 'react'
import { Globe, Server, Cloud, Zap, ExternalLink, RefreshCw, Shield, Terminal } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type NodeKind = 'site' | 'api' | 'cdn' | 'tunnel' | 'dns' | 'service'
type NodeStatus = 'up' | 'down' | 'pending' | 'unknown'
type ZoneGroup = 'wavult.com' | 'quixzoom.com' | 'hypbit.com' | 'evasvensson.se' | 'aws' | 'internal'

interface NetNode {
  id: string
  hostname: string
  label: string
  kind: NodeKind
  zone: ZoneGroup
  target: string       // where it points
  provider: string
  status: NodeStatus
  latency?: number
  description: string
  url?: string
  critical: boolean
}

// ─── Registry ─────────────────────────────────────────────────────────────────

const ALL_NODES: NetNode[] = [
  // ── wavult.com ───────────────────────────────────────────────────────────
  { id: 'wavult-root',    hostname: 'wavult.com',            label: 'Wavult Group',        kind: 'site',    zone: 'wavult.com',    target: 'wavult-group.pages.dev',              provider: 'CF Pages',     status: 'unknown', description: 'Wavult Group corporate website', url: 'https://wavult.com', critical: false },
  { id: 'wavult-www',     hostname: 'www.wavult.com',        label: 'www',                 kind: 'cdn',     zone: 'wavult.com',    target: 'wavult-group.pages.dev',              provider: 'CF Pages',     status: 'unknown', description: 'www alias → Wavult Group', url: 'https://www.wavult.com', critical: false },
  { id: 'wavult-os',      hostname: 'os.wavult.com',         label: 'Wavult OS',           kind: 'site',    zone: 'wavult.com',    target: 'wavult-os.pages.dev',                 provider: 'CF Pages',     status: 'unknown', description: 'Wavult OS — enterprise operating system', url: 'https://os.wavult.com', critical: true },
  { id: 'wavult-api',     hostname: 'api.wavult.com',        label: 'API',                 kind: 'api',     zone: 'wavult.com',    target: 'hypbit-api-alb → ECS eu-north-1',     provider: 'AWS ALB',      status: 'unknown', description: 'Wavult OS API — main backend', url: 'https://api.wavult.com/api/health', critical: true },
  { id: 'wavult-n8n',     hostname: 'n8n.wavult.com',        label: 'n8n',                 kind: 'service', zone: 'wavult.com',    target: 'hypbit-api-alb /n8n/*',               provider: 'AWS ECS',      status: 'unknown', description: 'n8n automation platform', url: 'https://n8n.wavult.com', critical: false },
  { id: 'wavult-ops',     hostname: 'ops.wavult.com',        label: 'Ops Dashboard',       kind: 'site',    zone: 'wavult.com',    target: 'd1moyzq0r9e8tq.cloudfront.net',       provider: 'CloudFront',   status: 'unknown', description: 'Operations dashboard', url: 'https://ops.wavult.com', critical: false },
  { id: 'wavult-brief',   hostname: 'brief.wavult.com',      label: 'Morning Brief',       kind: 'site',    zone: 'wavult.com',    target: 'd14gf6x22fx96q.cloudfront.net',       provider: 'CloudFront',   status: 'unknown', description: 'Morning Brief delivery endpoint', url: 'https://brief.wavult.com', critical: false },
  { id: 'wavult-admin',   hostname: 'admin.wavult.com',      label: 'Admin',               kind: 'site',    zone: 'wavult.com',    target: 'wavult-admin.pages.dev',              provider: 'CF Pages',     status: 'unknown', description: 'Wavult admin panel', url: 'https://admin.wavult.com', critical: false },
  { id: 'wavult-devs',    hostname: 'developers.wavult.com', label: 'API Docs',            kind: 'site',    zone: 'wavult.com',    target: 'wavult-api-docs.pages.dev',           provider: 'CF Pages',     status: 'unknown', description: 'Developer documentation', url: 'https://developers.wavult.com', critical: false },
  { id: 'wavult-bernt',   hostname: 'bernt.wavult.com',      label: 'Bernt (AI tunnel)',   kind: 'tunnel',  zone: 'wavult.com',    target: 'cfargotunnel.com → OpenClaw',         provider: 'CF Tunnel',    status: 'unknown', description: 'Bernt AI assistant — Cloudflare Tunnel to local OpenClaw', url: 'https://bernt.wavult.com', critical: true },

  // ── quixzoom.com ──────────────────────────────────────────────────────────
  { id: 'qx-root',        hostname: 'quixzoom.com',          label: 'quiXzoom',            kind: 'site',    zone: 'quixzoom.com',  target: 'd3nf5qp2za1hod.cloudfront.net',       provider: 'CloudFront',   status: 'unknown', description: 'quiXzoom landing page', url: 'https://quixzoom.com', critical: true },
  { id: 'qx-www',         hostname: 'www.quixzoom.com',      label: 'www',                 kind: 'cdn',     zone: 'quixzoom.com',  target: 'd3nf5qp2za1hod.cloudfront.net',       provider: 'CloudFront',   status: 'unknown', description: 'www alias → quiXzoom landing', url: 'https://www.quixzoom.com', critical: false },
  { id: 'qx-app',         hostname: 'app.quixzoom.com',      label: 'quiXzoom App',        kind: 'site',    zone: 'quixzoom.com',  target: 'dewrtqzc20flx.cloudfront.net',        provider: 'CloudFront',   status: 'unknown', description: 'quiXzoom web application — missions, zoomers', url: 'https://app.quixzoom.com', critical: true },
  { id: 'qx-api',         hostname: 'api.quixzoom.com',      label: 'quiXzoom API',        kind: 'api',     zone: 'quixzoom.com',  target: 'hypbit-api-alb → quixzoom-api ECS',   provider: 'AWS ALB',      status: 'unknown', description: 'quiXzoom API — missions, submissions, payouts', url: 'https://api.quixzoom.com/health', critical: true },

  // ── hypbit.com ────────────────────────────────────────────────────────────
  { id: 'hb-root',        hostname: 'hypbit.com',            label: 'hypbit (legacy)',     kind: 'cdn',     zone: 'hypbit.com',    target: 'd14gf6x22fx96q.cloudfront.net',       provider: 'CloudFront',   status: 'unknown', description: 'Legacy domain — redirects till Wavult', url: 'https://hypbit.com', critical: false },
  { id: 'hb-api',         hostname: 'api.wavult.com',        label: 'hypbit API (legacy)', kind: 'api',     zone: 'hypbit.com',    target: 'hypbit-api-alb → ECS',                provider: 'AWS ALB',      status: 'unknown', description: 'Legacy API alias — samma backend som api.wavult.com', url: 'https://api.wavult.com/api/health', critical: false },
  { id: 'hb-app',         hostname: 'app.hypbit.com',        label: 'app.hypbit (legacy)', kind: 'site',    zone: 'hypbit.com',    target: 'd1kvtgf5i55aab.cloudfront.net',       provider: 'CloudFront',   status: 'unknown', description: 'Legacy app domain', url: 'https://app.hypbit.com', critical: false },
  { id: 'hb-bernt',       hostname: 'bernt.hypbit.com',      label: 'Bernt (hypbit)',      kind: 'tunnel',  zone: 'hypbit.com',    target: 'trycloudflare.com tunnel',            provider: 'CF Tunnel',    status: 'unknown', description: 'Legacy Bernt tunnel via trycloudflare', url: 'https://bernt.hypbit.com', critical: false },

  // ── evasvensson.se ────────────────────────────────────────────────────────
  { id: 'eva-root',       hostname: 'evasvensson.se',        label: 'Eva Svensson',        kind: 'site',    zone: 'evasvensson.se', target: '76.76.21.21 (Vercel)',              provider: 'Vercel',       status: 'unknown', description: 'Eva Svensons personliga webbplats', url: 'https://evasvensson.se', critical: false },
  { id: 'eva-www',        hostname: 'www.evasvensson.se',    label: 'www',                 kind: 'cdn',     zone: 'evasvensson.se', target: '76.76.21.21 (Vercel)',              provider: 'Vercel',       status: 'unknown', description: 'www alias Eva Svensson', url: 'https://www.evasvensson.se', critical: false },

  // ── AWS Services (internal) ───────────────────────────────────────────────
  { id: 'ecs-wavult',     hostname: 'wavult-os-api',         label: 'Wavult OS API (ECS)', kind: 'service', zone: 'aws',           target: 'ECS hypbit cluster eu-north-1',       provider: 'AWS ECS',      status: 'unknown', description: 'Node.js API — main Wavult OS backend, port 3001', critical: true },
  { id: 'ecs-quixzoom',   hostname: 'quixzoom-api',          label: 'quiXzoom API (ECS)',  kind: 'service', zone: 'aws',           target: 'ECS hypbit cluster eu-north-1',       provider: 'AWS ECS',      status: 'unknown', description: 'quiXzoom API, Supabase-backed', critical: true },
  { id: 'ecs-kafka',      hostname: 'wavult-kafka',          label: 'Kafka (ECS)',         kind: 'service', zone: 'aws',           target: '172.31.25.69:9092 EFS',               provider: 'AWS ECS',      status: 'unknown', description: 'Kafka event backbone — 16 topics, wavult.* schema', critical: true },
  { id: 'ecs-identity',   hostname: 'identity-core',         label: 'Identity Core (ECS)', kind: 'service', zone: 'aws',           target: 'ECS hypbit cluster eu-north-1',       provider: 'AWS ECS',      status: 'unknown', description: 'Sovereign auth — Argon2id, JWT/KMS, RDS + DynamoDB', critical: true },
  { id: 'ecs-landvex',    hostname: 'landvex-api',           label: 'LandveX API (ECS)',   kind: 'service', zone: 'aws',           target: 'ECS hypbit cluster eu-north-1',       provider: 'AWS ECS',      status: 'unknown', description: 'LandveX B2G API — /v1/objects, /v1/alerts', critical: false },
  { id: 'ecs-n8n',        hostname: 'n8n',                   label: 'n8n (ECS)',           kind: 'service', zone: 'aws',           target: 'ECS hypbit cluster eu-north-1',       provider: 'AWS ECS',      status: 'unknown', description: 'n8n automation — Morning Brief, BOS webhooks, WHOOP', critical: false },

  // ── Internal / OpenClaw ───────────────────────────────────────────────────
  { id: 'openclaw',       hostname: 'openclaw-local',        label: 'OpenClaw (Bernt)',    kind: 'service', zone: 'internal',      target: 'WSL2 · localhost',                    provider: 'OpenClaw',     status: 'unknown', description: 'OpenClaw runtime — Bernt AI, Telegram gateway, cron, memory', critical: true },
  { id: 'bernt-tunnel',   hostname: 'CF Tunnel',             label: 'Cloudflare Tunnel',   kind: 'tunnel',  zone: 'internal',      target: 'bernt.wavult.com → OpenClaw',         provider: 'CF Tunnel',    status: 'unknown', description: 'Persistent CF tunnel exposing Bernt externally', critical: true },
]

// ─── Zone config ──────────────────────────────────────────────────────────────

const ZONE_CONFIG: Record<ZoneGroup, { color: string; label: string; icon: React.ElementType }> = {
  'wavult.com':    { color: '#3B82F6', label: 'wavult.com',    icon: Globe },
  'quixzoom.com':  { color: '#10B981', label: 'quixzoom.com',  icon: Globe },
  'hypbit.com':    { color: '#6B7280', label: 'hypbit.com',    icon: Globe },
  'evasvensson.se':{ color: '#A855F7', label: 'evasvensson.se',icon: Globe },
  'aws':           { color: '#F97316', label: 'AWS',           icon: Server },
  'internal':      { color: '#06B6D4', label: 'Internal',      icon: Terminal },
}

const KIND_ICON: Record<NodeKind, React.ElementType> = {
  site:    Globe,
  api:     Zap,
  cdn:     Cloud,
  tunnel:  Shield,
  dns:     Globe,
  service: Server,
}

// ─── Status check ─────────────────────────────────────────────────────────────

async function checkUrl(url: string): Promise<{ status: NodeStatus; latency: number }> {
  const start = performance.now()
  try {
    const res = await fetch(url, { method: 'HEAD', mode: 'no-cors', cache: 'no-store', signal: AbortSignal.timeout(6000) })
    const latency = Math.round(performance.now() - start)
    // no-cors gives opaque response — treat as up if no error thrown
    return { status: res.type === 'opaque' || res.ok ? 'up' : 'down', latency }
  } catch {
    return { status: 'down', latency: Math.round(performance.now() - start) }
  }
}

// ─── Node Card ────────────────────────────────────────────────────────────────

function NodeCard({ node, selected, onClick }: {
  node: NetNode
  selected: boolean
  onClick: () => void
}) {
  const zone = ZONE_CONFIG[node.zone]
  const Icon = KIND_ICON[node.kind]

  const statusColor = node.status === 'up' ? '#10B981'
    : node.status === 'down' ? '#EF4444'
    : '#52525B'

  return (
    <div onClick={onClick} style={{
      background: selected ? 'var(--color-bg-muted)' : 'var(--color-surface)',
      border: `1px solid ${selected ? zone.color : 'var(--color-border)'}`,
      borderLeft: `3px solid ${node.critical ? zone.color : 'var(--color-border)'}`,
      borderRadius: 4,
      padding: '10px 12px',
      cursor: 'pointer',
      transition: 'all 0.12s',
      fontFamily: 'ui-monospace, "SF Mono", monospace',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
          <Icon size={11} color="var(--color-text-muted)" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {node.hostname}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          {node.status === 'up' && (
            <span style={{ position: 'relative', display: 'inline-flex', width: 7, height: 7 }}>
              <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: statusColor, opacity: 0.4, animation: 'ping 2s infinite' }} />
              <span style={{ position: 'relative', width: 7, height: 7, borderRadius: '50%', background: statusColor, boxShadow: `0 0 5px ${statusColor}` }} />
            </span>
          )}
          {node.status !== 'up' && (
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor }} />
          )}
        </div>
      </div>

      <div style={{ fontSize: 9, color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 6 }}>
        → {node.target}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{
          padding: '1px 6px', borderRadius: 3,
          background: `${zone.color}15`, border: `1px solid ${zone.color}30`,
          fontSize: 8, fontWeight: 700, color: zone.color, letterSpacing: '0.06em',
        }}>
          {node.provider}
        </div>
        {node.latency !== undefined && (
          <span style={{ fontSize: 9, color: 'var(--color-text-muted)', fontVariantNumeric: 'tabular-nums' }}>
            {node.latency}ms
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function DetailPanel({ node, onClose }: { node: NetNode; onClose: () => void }) {
  const zone = ZONE_CONFIG[node.zone]
  const statusColor = node.status === 'up' ? '#10B981' : node.status === 'down' ? '#EF4444' : '#52525B'
  const statusLabel = node.status === 'up' ? 'ONLINE' : node.status === 'down' ? 'OFFLINE' : 'UNKNOWN'

  return (
    <div style={{
      width: 320, flexShrink: 0,
      borderLeft: '1px solid var(--color-border)',
      background: 'var(--color-surface)',
      display: 'flex', flexDirection: 'column',
      fontFamily: 'ui-monospace, "SF Mono", monospace',
      overflow: 'hidden',
    }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 2 }}>{node.hostname}</div>
          <div style={{ fontSize: 9, color: 'var(--color-text-muted)' }}>{node.label}</div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: 14, padding: 2 }}>✕</button>
      </div>

      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <div style={{ padding: '3px 8px', borderRadius: 3, background: `${statusColor}15`, border: `1px solid ${statusColor}30`, fontSize: 9, fontWeight: 700, color: statusColor, display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: statusColor }} />
          {statusLabel}
        </div>
        <div style={{ padding: '3px 8px', borderRadius: 3, background: `${zone.color}15`, border: `1px solid ${zone.color}30`, fontSize: 9, fontWeight: 700, color: zone.color }}>
          {zone.label}
        </div>
        {node.critical && (
          <div style={{ padding: '3px 8px', borderRadius: 3, background: '#10B98115', border: '1px solid #10B98130', fontSize: 9, fontWeight: 700, color: '#10B981' }}>
            CRITICAL
          </div>
        )}
      </div>

      <div style={{ padding: '14px 20px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <div style={{ fontSize: 8, color: 'var(--color-text-muted)', letterSpacing: '0.1em', marginBottom: 6 }}>DESCRIPTION</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>{node.description}</div>
        </div>

        <div>
          <div style={{ fontSize: 8, color: 'var(--color-text-muted)', letterSpacing: '0.1em', marginBottom: 6 }}>ROUTING</div>
          <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', fontFamily: 'ui-monospace', lineHeight: 1.6, padding: '8px 10px', background: 'var(--color-bg-subtle)', borderRadius: 4 }}>
            {node.hostname}<br />
            <span style={{ color: 'var(--color-text-muted)' }}>→ {node.target}</span>
          </div>
        </div>

        {[
          { k: 'Provider', v: node.provider },
          { k: 'Kind', v: node.kind.toUpperCase() },
          { k: 'Zone', v: node.zone },
          { k: 'Latency', v: node.latency !== undefined ? `${node.latency} ms` : '—' },
        ].map(r => (
          <div key={r.k} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: 8, fontSize: 11 }}>
            <span style={{ color: 'var(--color-text-muted)' }}>{r.k}</span>
            <span style={{ color: 'var(--color-text-primary)', fontFamily: 'ui-monospace' }}>{r.v}</span>
          </div>
        ))}

        {node.url && (
          <a href={node.url} target="_blank" rel="noopener noreferrer" style={{
            display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center',
            padding: '8px', borderRadius: 4, border: '1px solid var(--color-border)',
            color: 'var(--color-text-secondary)', textDecoration: 'none', fontSize: 10,
            background: 'var(--color-bg-subtle)',
          }}>
            <ExternalLink size={11} />
            Open {node.hostname}
          </a>
        )}
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

type FilterZone = 'all' | ZoneGroup

export function NetworkMap() {
  const [nodes, setNodes] = useState<NetNode[]>(ALL_NODES)
  const [selected, setSelected] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterZone>('all')
  const [checking, setChecking] = useState(false)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)

  const runChecks = useCallback(async () => {
    setChecking(true)
    const checkable = ALL_NODES.filter(n => n.url)
    const results = await Promise.allSettled(
      checkable.map(n => checkUrl(n.url!).then(r => ({ id: n.id, ...r })))
    )
    setNodes(prev => prev.map(n => {
      const r = results.find(res => res.status === 'fulfilled' && (res.value as { id: string }).id === n.id)
      if (!r || r.status !== 'fulfilled') return n
      const v = r.value as { status: NodeStatus; latency: number }
      return { ...n, status: v.status, latency: v.latency }
    }))
    setLastChecked(new Date())
    setChecking(false)
  }, [])

  useEffect(() => { runChecks() }, [runChecks])

  const filtered = filter === 'all' ? nodes : nodes.filter(n => n.zone === filter)
  const selectedNode = nodes.find(n => n.id === selected) ?? null

  const zones = Object.keys(ZONE_CONFIG) as ZoneGroup[]
  const upCount = nodes.filter(n => n.status === 'up').length
  const downCount = nodes.filter(n => n.status === 'down').length
  const totalCheckable = nodes.filter(n => n.url).length

  // Group by zone
  const groups = (filter === 'all' ? zones : [filter as ZoneGroup]).map(zone => ({
    zone,
    cfg: ZONE_CONFIG[zone],
    nodes: filtered.filter(n => n.zone === zone),
  })).filter(g => g.nodes.length > 0)

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--color-bg-secondary)', fontFamily: 'ui-monospace, "SF Mono", monospace' }}>

      {/* ── Top bar ── */}
      <div style={{
        flexShrink: 0, padding: '10px 20px',
        borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
        display: 'flex', alignItems: 'center', gap: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingRight: 20, borderRight: '1px solid var(--color-border)' }}>
          <Globe size={13} color="var(--color-text-secondary)" />
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '0.06em' }}>
            NETWORK MAP
          </span>
        </div>

        {[
          { label: 'ENDPOINTS', value: String(totalCheckable) },
          { label: 'ONLINE',    value: String(upCount),    color: upCount > 0 ? '#10B981' : undefined },
          { label: 'OFFLINE',   value: String(downCount),  color: downCount > 0 ? '#EF4444' : undefined },
          { label: 'TOTAL',     value: String(nodes.length) },
        ].map(s => (
          <div key={s.label} style={{ paddingLeft: 20, paddingRight: 20, borderRight: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: 7, color: 'var(--color-text-muted)', letterSpacing: '0.1em', marginBottom: 2 }}>{s.label}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: s.color ?? 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}>{s.value}</div>
          </div>
        ))}

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          {lastChecked && (
            <span style={{ fontSize: 9, color: 'var(--color-text-muted)' }}>
              checked {lastChecked.toLocaleTimeString('sv-SE')}
            </span>
          )}
          <button onClick={runChecks} disabled={checking} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '6px 12px', borderRadius: 4,
            border: '1px solid var(--color-border)',
            background: 'var(--color-bg-subtle)',
            color: 'var(--color-text-secondary)',
            fontSize: 10, fontWeight: 600, cursor: 'pointer',
            letterSpacing: '0.04em',
            opacity: checking ? 0.6 : 1,
          }}>
            <RefreshCw size={11} style={{ animation: checking ? 'spin 1s linear infinite' : 'none' }} />
            {checking ? 'CHECKING...' : 'REFRESH'}
          </button>
        </div>
      </div>

      {/* ── Zone filter ── */}
      <div style={{
        flexShrink: 0, padding: '8px 20px',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex', gap: 4, background: 'var(--color-surface)',
      }}>
        {(['all', ...zones] as FilterZone[]).map(z => {
          const cfg = z === 'all' ? null : ZONE_CONFIG[z]
          const active = filter === z
          return (
            <button key={z} onClick={() => setFilter(z)} style={{
              padding: '4px 10px', borderRadius: 4, border: 'none', cursor: 'pointer',
              fontSize: 9, fontWeight: 700, letterSpacing: '0.06em',
              background: active ? (cfg?.color ?? 'var(--color-text-primary)') + '20' : 'transparent',
              color: active ? (cfg?.color ?? 'var(--color-text-primary)') : 'var(--color-text-muted)',
              border: active ? `1px solid ${(cfg?.color ?? 'var(--color-text-primary)') + '40'}` : '1px solid transparent',
              transition: 'all 0.12s',
            }}>
              {z === 'all' ? 'ALL' : cfg?.label.toUpperCase()}
            </button>
          )
        })}
      </div>

      {/* ── Content ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
          {groups.map(({ zone, cfg, nodes: zNodes }) => {
            const ZoneIcon = cfg.icon
            const up = zNodes.filter(n => n.status === 'up').length
            const down = zNodes.filter(n => n.status === 'down').length
            return (
              <div key={zone} style={{ marginBottom: 24 }}>
                {/* Zone header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <ZoneIcon size={12} color={cfg.color} />
                  <span style={{ fontSize: 9, fontWeight: 800, color: cfg.color, letterSpacing: '0.12em' }}>
                    {cfg.label.toUpperCase()}
                  </span>
                  <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
                  <span style={{ fontSize: 9, color: 'var(--color-text-muted)' }}>
                    {up > 0 && <span style={{ color: '#10B981' }}>{up} up</span>}
                    {down > 0 && <span style={{ color: '#EF4444' }}> · {down} down</span>}
                    <span style={{ color: 'var(--color-text-muted)' }}> / {zNodes.length}</span>
                  </span>
                </div>

                {/* Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8 }}>
                  {zNodes.map(n => (
                    <NodeCard
                      key={n.id}
                      node={n}
                      selected={selected === n.id}
                      onClick={() => setSelected(s => s === n.id ? null : n.id)}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {selectedNode && (
          <DetailPanel node={selectedNode} onClose={() => setSelected(null)} />
        )}
      </div>

      <style>{`
        @keyframes ping { 75%,100% { transform:scale(2.5); opacity:0 } }
        @keyframes spin  { from { transform:rotate(0deg) } to { transform:rotate(360deg) } }
      `}</style>
    </div>
  )
}
