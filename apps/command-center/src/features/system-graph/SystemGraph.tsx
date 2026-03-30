// ─── Wavult OSCL — Operational System Control Layer ──────────────────────────
// Not a diagram. A control room.

import React, { useState, useEffect, useCallback, useRef } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

type NodeStatus = 'live' | 'degraded' | 'dead' | 'pending'
type Zone = 'edge' | 'execution' | 'data' | 'control'

interface LiveMetrics {
  latency: number      // ms
  load: number         // 0-100
  rps: number          // requests/sec
  errors: number       // error rate %
  uptime: number       // %
}

interface SystemNode {
  id: string
  label: string
  sublabel: string
  zone: Zone
  status: NodeStatus
  metrics: LiveMetrics
  description: string
  dependencies: string[]
  logs: string[]
  critical: boolean    // part of critical path
}

interface SystemEdge {
  id: string
  from: string
  to: string
  critical: boolean
  label?: string
}

// ─── Initial Data ─────────────────────────────────────────────────────────────

const INITIAL_NODES: SystemNode[] = [
  // EDGE
  {
    id: 'cloudflare', label: 'Cloudflare', sublabel: 'DNS · WAF · CDN',
    zone: 'edge', status: 'live', critical: true,
    metrics: { latency: 4, load: 22, rps: 14200, errors: 0.0, uptime: 99.99 },
    description: 'Global CDN, WAF, DNS. Entry point for all traffic.',
    dependencies: [], logs: ['[INFO] DNS propagated wavult.com', '[INFO] WAF rules updated', '[INFO] Cache hit rate 94%'],
  },
  {
    id: 'cf-pages', label: 'CF Pages', sublabel: 'Frontends · Static CDN',
    zone: 'edge', status: 'live', critical: false,
    metrics: { latency: 18, load: 15, rps: 3400, errors: 0.0, uptime: 99.98 },
    description: 'Static frontends: Wavult OS, LandveX, quiXzoom landing.',
    dependencies: ['cloudflare'], logs: ['[INFO] Build deployed wavult-os', '[INFO] Build deployed landvex-eu'],
  },
  {
    id: 'alb', label: 'Load Balancer', sublabel: 'ALB · eu-north-1',
    zone: 'edge', status: 'live', critical: true,
    metrics: { latency: 8, load: 41, rps: 8600, errors: 0.1, uptime: 99.97 },
    description: 'Application Load Balancer. Routes all API traffic by host + path.',
    dependencies: ['cloudflare'], logs: ['[INFO] Health check pass: hypbit-api', '[INFO] Health check pass: quixzoom-api', '[INFO] Target group 8/8 healthy'],
  },
  // EXECUTION
  {
    id: 'wavult-api', label: 'Wavult OS API', sublabel: 'Node.js · port 3001',
    zone: 'execution', status: 'live', critical: true,
    metrics: { latency: 42, load: 58, rps: 2100, errors: 0.2, uptime: 99.8 },
    description: 'Main Wavult OS backend. BOS tasks, auth, WHOOP, comms hub.',
    dependencies: ['alb'], logs: ['[INFO] BOS scheduler heartbeat', '[INFO] WHOOP sync completed', '[INFO] 847 tasks processed today'],
  },
  {
    id: 'quixzoom-api', label: 'quiXzoom API', sublabel: 'Node.js · missions',
    zone: 'execution', status: 'live', critical: false,
    metrics: { latency: 38, load: 34, rps: 1200, errors: 0.1, uptime: 99.1 },
    description: 'quiXzoom platform: missions, zoomers, submissions, payouts.',
    dependencies: ['alb'], logs: ['[INFO] Mission #4821 created', '[INFO] Submission approved', '[WARN] Payout queue depth: 12'],
  },
  {
    id: 'wavult-core', label: 'Wavult Core', sublabel: 'Financial Engine · 3007',
    zone: 'execution', status: 'live', critical: true,
    metrics: { latency: 61, load: 47, rps: 430, errors: 0.3, uptime: 99.6 },
    description: 'Financial engine: splits, fraud detection, event bus, state machine.',
    dependencies: ['alb'], logs: ['[INFO] Split engine: 14 txns processed', '[INFO] Fraud check: 0 flags', '[INFO] State machine: 3 flows active'],
  },
  {
    id: 'landvex-api', label: 'LandveX API', sublabel: 'B2G · port 3006',
    zone: 'execution', status: 'live', critical: false,
    metrics: { latency: 54, load: 21, rps: 180, errors: 0.0, uptime: 99.9 },
    description: 'B2G: /v1/objects, /v1/alerts, BOS webhooks for municipalities.',
    dependencies: ['alb'], logs: ['[INFO] Object sync: 3 zones updated', '[INFO] Alert #882 dispatched', '[INFO] BOS webhook delivered'],
  },
  {
    id: 'identity-core', label: 'Identity Core', sublabel: 'Auth · JWT/KMS · 3005',
    zone: 'execution', status: 'live', critical: true,
    metrics: { latency: 31, load: 29, rps: 640, errors: 0.0, uptime: 99.99 },
    description: 'Sovereign auth: Argon2id hashing, JWT/KMS signing, session epochs.',
    dependencies: ['alb'], logs: ['[INFO] 142 tokens issued today', '[INFO] KMS key rotation scheduled', '[INFO] 0 auth failures'],
  },
  {
    id: 'kafka', label: 'Kafka', sublabel: 'Event backbone · 9092',
    zone: 'execution', status: 'live', critical: true,
    metrics: { latency: 12, load: 18, rps: 3800, errors: 0.0, uptime: 99.95 },
    description: '16 topics. wavult.missions.* · wavult.alerts.* · wavult.comms.send',
    dependencies: [], logs: ['[INFO] 16 topics healthy', '[INFO] Consumer lag: 0ms', '[INFO] Throughput: 3.8k msgs/s'],
  },
  // DATA
  {
    id: 'supabase-wavult', label: 'Supabase — Wavult', sublabel: 'znmxtnxx · eu-west-1',
    zone: 'data', status: 'live', critical: true,
    metrics: { latency: 24, load: 44, rps: 1800, errors: 0.1, uptime: 99.95 },
    description: 'Wavult OS DB: bos_tasks, events, audit_log, team_locations.',
    dependencies: ['wavult-api', 'kafka'], logs: ['[INFO] Connections: 18/100', '[INFO] Replication lag: 0ms', '[INFO] Backup: 02:14 UTC'],
  },
  {
    id: 'supabase-quixzoom', label: 'Supabase — quiXzoom', sublabel: 'lpeipzdm · eu-west-1',
    zone: 'data', status: 'live', critical: false,
    metrics: { latency: 26, load: 31, rps: 940, errors: 0.0, uptime: 99.9 },
    description: 'quiXzoom DB: missions, assignments, submissions, payouts.',
    dependencies: ['quixzoom-api'], logs: ['[INFO] Connections: 11/100', '[INFO] 4821 missions in DB', '[INFO] Storage: 2.4 GB'],
  },
  {
    id: 'rds', label: 'RDS PostgreSQL', sublabel: 'Multi-AZ · eu-north-1',
    zone: 'data', status: 'live', critical: true,
    metrics: { latency: 19, load: 38, rps: 620, errors: 0.0, uptime: 99.99 },
    description: 'Identity Core DB: ic_users, ic_auth_events. Multi-AZ standby active.',
    dependencies: ['identity-core'], logs: ['[INFO] Multi-AZ standby: healthy', '[INFO] Backup retention: 14d', '[INFO] IOPS: 450/3000'],
  },
  {
    id: 'dynamo', label: 'DynamoDB', sublabel: 'PITR enabled · sessions',
    zone: 'data', status: 'live', critical: true,
    metrics: { latency: 8, load: 12, rps: 1100, errors: 0.0, uptime: 99.999 },
    description: 'Session store: ic-sessions + ic-refresh-tokens. PITR enabled.',
    dependencies: ['identity-core'], logs: ['[INFO] PITR: ENABLED', '[INFO] Read capacity: 12/25 RCU', '[INFO] Write capacity: 4/25 WCU'],
  },
  {
    id: 's3', label: 'S3 Multi-Region', sublabel: 'EU primary + DR backup',
    zone: 'data', status: 'live', critical: false,
    metrics: { latency: 55, load: 8, rps: 280, errors: 0.0, uptime: 99.999 },
    description: 'Image storage + DR. CRR to eu-west-1. Versioning enabled.',
    dependencies: ['quixzoom-api'], logs: ['[INFO] CRR sync: eu-primary → eu-backup', '[INFO] Storage: 48.2 GB', '[INFO] DR bucket synced'],
  },
  // CONTROL
  {
    id: 'n8n', label: 'n8n', sublabel: 'Automation · port 5678',
    zone: 'control', status: 'live', critical: false,
    metrics: { latency: 220, load: 19, rps: 24, errors: 0.0, uptime: 99.7 },
    description: 'Morning Brief, BOS webhooks, WHOOP sync, email via SES.',
    dependencies: ['wavult-api', 'kafka'], logs: ['[INFO] Morning Brief: sent 08:00', '[INFO] WHOOP sync: 5 users', '[INFO] 3 workflows active'],
  },
  {
    id: 'bos-scheduler', label: 'BOS Scheduler', sublabel: '500ms loop · watchdog',
    zone: 'control', status: 'live', critical: false,
    metrics: { latency: 14, load: 8, rps: 120, errors: 0.0, uptime: 99.9 },
    description: 'Job queue: DEADLINE_CHECK (5m), RECONCILE (10m), FLOW (15m).',
    dependencies: ['supabase-wavult'], logs: ['[INFO] DEADLINE_CHECK: 0 overdue', '[INFO] RECONCILE: pass', '[INFO] Loop: 500ms stable'],
  },
]

const EDGES: SystemEdge[] = [
  // Critical path
  { id: 'e1', from: 'cloudflare', to: 'alb', critical: true, label: 'route' },
  { id: 'e2', from: 'alb', to: 'wavult-api', critical: true, label: 'os.*' },
  { id: 'e3', from: 'alb', to: 'identity-core', critical: true, label: 'auth' },
  { id: 'e4', from: 'wavult-api', to: 'kafka', critical: true, label: 'publish' },
  { id: 'e5', from: 'wavult-api', to: 'supabase-wavult', critical: true, label: 'write' },
  { id: 'e6', from: 'identity-core', to: 'rds', critical: true },
  { id: 'e7', from: 'identity-core', to: 'dynamo', critical: true },
  // Secondary
  { id: 'e8', from: 'cloudflare', to: 'cf-pages', critical: false, label: 'cdn' },
  { id: 'e9', from: 'alb', to: 'quixzoom-api', critical: false, label: 'qx' },
  { id: 'e10', from: 'alb', to: 'wavult-core', critical: false, label: 'fin' },
  { id: 'e11', from: 'alb', to: 'landvex-api', critical: false, label: 'lvx' },
  { id: 'e12', from: 'quixzoom-api', to: 'supabase-quixzoom', critical: false },
  { id: 'e13', from: 'quixzoom-api', to: 's3', critical: false },
  { id: 'e14', from: 'kafka', to: 'n8n', critical: false, label: 'events' },
  { id: 'e15', from: 'bos-scheduler', to: 'supabase-wavult', critical: false },
  { id: 'e16', from: 'landvex-api', to: 'kafka', critical: false },
  { id: 'e17', from: 'wavult-core', to: 'supabase-wavult', critical: false },
]

// ─── Zone config ──────────────────────────────────────────────────────────────

const ZONE_CONFIG: Record<Zone, { label: string; color: string; glow: string }> = {
  edge:      { label: 'EDGE',      color: '#06B6D4', glow: '#06B6D420' },
  execution: { label: 'EXECUTION', color: '#3B82F6', glow: '#3B82F620' },
  data:      { label: 'DATA',      color: '#F97316', glow: '#F9731620' },
  control:   { label: 'CONTROL',   color: '#A855F7', glow: '#A855F720' },
}

const STATUS_CONFIG: Record<NodeStatus, { color: string; label: string; pulse: boolean }> = {
  live:     { color: '#10B981', label: 'LIVE',     pulse: true },
  degraded: { color: '#F59E0B', label: 'DEGRADED', pulse: true },
  dead:     { color: '#EF4444', label: 'DEAD',     pulse: false },
  pending:  { color: '#6B7280', label: 'PENDING',  pulse: false },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadColor(load: number): string {
  if (load < 50) return '#10B981'
  if (load < 80) return '#F59E0B'
  return '#EF4444'
}

function fmtRps(rps: number): string {
  if (rps >= 1000) return `${(rps / 1000).toFixed(1)}k`
  return String(rps)
}

function jitter(val: number, range: number): number {
  return Math.max(0, val + (Math.random() - 0.5) * range * 2)
}

// ─── Node Card ────────────────────────────────────────────────────────────────

function NodeCard({
  node, selected, onClick,
}: {
  node: SystemNode
  selected: boolean
  onClick: () => void
}) {
  const zone = ZONE_CONFIG[node.zone]
  const status = STATUS_CONFIG[node.status]
  const lc = loadColor(node.metrics.load)

  return (
    <div
      onClick={onClick}
      style={{
        background: selected ? '#0F0F0F' : '#080808',
        border: `1px solid ${selected ? zone.color : '#1A1A1A'}`,
        borderLeft: `3px solid ${node.critical ? zone.color : '#2A2A2A'}`,
        borderRadius: 4,
        padding: '10px 12px',
        cursor: 'pointer',
        width: 210,
        boxShadow: selected
          ? `0 0 0 1px ${zone.color}60, 0 4px 24px ${zone.color}20`
          : node.status === 'degraded' ? '0 0 12px #F59E0B20' : 'none',
        transition: 'all 0.15s',
        fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
        position: 'relative',
      }}
    >
      {/* Critical indicator */}
      {node.critical && (
        <div style={{
          position: 'absolute', top: 0, right: 0,
          width: 0, height: 0,
          borderStyle: 'solid',
          borderWidth: '0 8px 8px 0',
          borderColor: `transparent ${zone.color} transparent transparent`,
          borderRadius: '0 4px 0 0',
        }} />
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#E4E4E7', letterSpacing: '0.02em', lineHeight: 1.2 }}>
            {node.label}
          </div>
          <div style={{ fontSize: 9, color: '#3F3F46', marginTop: 2, lineHeight: 1.3 }}>
            {node.sublabel}
          </div>
        </div>
        {/* Status dot */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, marginLeft: 6 }}>
          <div style={{ position: 'relative', width: 7, height: 7 }}>
            {status.pulse && (
              <div style={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                background: status.color, opacity: 0.4,
                animation: 'ping 2s cubic-bezier(0,0,0.2,1) infinite',
              }} />
            )}
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              background: status.color,
              boxShadow: status.pulse ? `0 0 6px ${status.color}` : 'none',
            }} />
          </div>
          <span style={{ fontSize: 8, fontWeight: 700, color: status.color, letterSpacing: '0.08em' }}>
            {status.label}
          </span>
        </div>
      </div>

      {/* Metrics grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: '4px 8px',
        borderTop: '1px solid #141414',
        paddingTop: 8,
      }}>
        {[
          { label: 'LATENCY', value: `${Math.round(node.metrics.latency)}ms`, color: node.metrics.latency > 200 ? '#F59E0B' : '#A1A1AA' },
          { label: 'RPS', value: fmtRps(node.metrics.rps), color: '#A1A1AA' },
          { label: 'LOAD', value: `${Math.round(node.metrics.load)}%`, color: lc },
          { label: 'ERRORS', value: `${node.metrics.errors.toFixed(1)}%`, color: node.metrics.errors > 1 ? '#EF4444' : '#A1A1AA' },
        ].map(m => (
          <div key={m.label}>
            <div style={{ fontSize: 7, color: '#3F3F46', letterSpacing: '0.1em', marginBottom: 1 }}>{m.label}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: m.color, fontVariantNumeric: 'tabular-nums' }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Load bar */}
      <div style={{ marginTop: 8, height: 2, background: '#141414', borderRadius: 1, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${node.metrics.load}%`,
          background: lc,
          transition: 'width 0.8s ease',
          boxShadow: `0 0 4px ${lc}80`,
        }} />
      </div>
    </div>
  )
}

// ─── Canvas Layout ────────────────────────────────────────────────────────────

const ZONE_ORDER: Zone[] = ['edge', 'execution', 'data', 'control']
const ZONE_WIDTH = 260
const NODE_HEIGHT = 118
const NODE_GAP = 14
const ZONE_PAD = { top: 56, left: 16 }

function getNodePos(node: SystemNode, allNodes: SystemNode[]) {
  const zoneNodes = allNodes.filter(n => n.zone === node.zone)
  const idx = zoneNodes.findIndex(n => n.id === node.id)
  const zoneIdx = ZONE_ORDER.indexOf(node.zone)
  return {
    x: zoneIdx * ZONE_WIDTH + ZONE_PAD.left,
    y: ZONE_PAD.top + idx * (NODE_HEIGHT + NODE_GAP),
  }
}

// ─── Canvas SVG (edges) ───────────────────────────────────────────────────────

function EdgeLayer({ nodes, edges, selectedId }: {
  nodes: SystemNode[]
  edges: SystemEdge[]
  selectedId: string | null
}) {
  const nodeCenter = (id: string) => {
    const n = nodes.find(x => x.id === id)
    if (!n) return { x: 0, y: 0 }
    const pos = getNodePos(n, nodes)
    return { x: pos.x + 210, y: pos.y + NODE_HEIGHT / 2 }
  }

  return (
    <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible' }}>
      <defs>
        <marker id="arrow-critical" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill="#10B981" />
        </marker>
        <marker id="arrow-normal" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill="#2A2A2A" />
        </marker>
        <filter id="glow-green">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {edges.map(edge => {
        const from = nodeCenter(edge.from)
        const to = nodeCenter(edge.to)
        const mx = (from.x + to.x) / 2
        const isSelected = selectedId === edge.from || selectedId === edge.to

        return (
          <g key={edge.id}>
            <path
              d={`M${from.x},${from.y} C${mx},${from.y} ${mx},${to.y} ${to.x},${to.y}`}
              fill="none"
              stroke={edge.critical ? '#10B981' : '#1E1E1E'}
              strokeWidth={edge.critical ? (isSelected ? 2.5 : 2) : 1}
              strokeDasharray={edge.critical ? undefined : '4,4'}
              markerEnd={`url(#arrow-${edge.critical ? 'critical' : 'normal'})`}
              filter={edge.critical ? 'url(#glow-green)' : undefined}
              opacity={isSelected ? 1 : edge.critical ? 0.7 : 0.4}
            />
            {edge.label && (
              <text
                x={mx}
                y={Math.min(from.y, to.y) + Math.abs(to.y - from.y) / 2 - 4}
                fontSize="8"
                fill="#3F3F46"
                textAnchor="middle"
                fontFamily="ui-monospace, monospace"
              >
                {edge.label}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function DetailPanel({ node, onClose }: { node: SystemNode; onClose: () => void }) {
  const zone = ZONE_CONFIG[node.zone]
  const status = STATUS_CONFIG[node.status]

  return (
    <div style={{
      width: 320, flexShrink: 0,
      background: '#060606',
      borderLeft: '1px solid #141414',
      display: 'flex', flexDirection: 'column',
      fontFamily: 'ui-monospace, "SF Mono", monospace',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #141414' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#F4F4F5', marginBottom: 2 }}>{node.label}</div>
            <div style={{ fontSize: 9, color: '#3F3F46' }}>{node.sublabel}</div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#3F3F46', fontSize: 14, padding: '2px 4px',
          }}>✕</button>
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '3px 8px', borderRadius: 3,
            background: `${status.color}15`, border: `1px solid ${status.color}30`,
          }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: status.color }} />
            <span style={{ fontSize: 9, fontWeight: 700, color: status.color, letterSpacing: '0.08em' }}>{status.label}</span>
          </div>
          <div style={{
            padding: '3px 8px', borderRadius: 3,
            background: `${zone.color}15`, border: `1px solid ${zone.color}30`,
            fontSize: 9, fontWeight: 700, color: zone.color, letterSpacing: '0.08em',
          }}>{zone.label}</div>
          {node.critical && (
            <div style={{
              padding: '3px 8px', borderRadius: 3,
              background: '#10B98115', border: '1px solid #10B98130',
              fontSize: 9, fontWeight: 700, color: '#10B981', letterSpacing: '0.08em',
            }}>CRITICAL PATH</div>
          )}
        </div>
      </div>

      {/* Metrics */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #141414' }}>
        <div style={{ fontSize: 8, color: '#3F3F46', letterSpacing: '0.1em', marginBottom: 10 }}>METRICS</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 20px' }}>
          {[
            { k: 'Latency', v: `${Math.round(node.metrics.latency)} ms` },
            { k: 'Throughput', v: `${fmtRps(node.metrics.rps)} rps` },
            { k: 'Load', v: `${Math.round(node.metrics.load)}%`, c: loadColor(node.metrics.load) },
            { k: 'Errors', v: `${node.metrics.errors.toFixed(2)}%`, c: node.metrics.errors > 1 ? '#EF4444' : undefined },
            { k: 'Uptime 30d', v: `${node.metrics.uptime.toFixed(2)}%` },
          ].map(m => (
            <div key={m.k}>
              <div style={{ fontSize: 8, color: '#3F3F46', letterSpacing: '0.08em', marginBottom: 3 }}>{m.k.toUpperCase()}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: m.c ?? '#A1A1AA', fontVariantNumeric: 'tabular-nums' }}>{m.v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Description */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #141414' }}>
        <div style={{ fontSize: 8, color: '#3F3F46', letterSpacing: '0.1em', marginBottom: 8 }}>DESCRIPTION</div>
        <div style={{ fontSize: 11, color: '#71717A', lineHeight: 1.7 }}>{node.description}</div>
      </div>

      {/* Dependencies */}
      {node.dependencies.length > 0 && (
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #141414' }}>
          <div style={{ fontSize: 8, color: '#3F3F46', letterSpacing: '0.1em', marginBottom: 8 }}>DEPENDENCIES</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {node.dependencies.map(d => (
              <span key={d} style={{
                padding: '2px 8px', borderRadius: 3,
                background: '#141414', border: '1px solid #1E1E1E',
                fontSize: 9, color: '#71717A',
              }}>{d}</span>
            ))}
          </div>
        </div>
      )}

      {/* Logs */}
      <div style={{ padding: '14px 20px', flex: 1, overflowY: 'auto' }}>
        <div style={{ fontSize: 8, color: '#3F3F46', letterSpacing: '0.1em', marginBottom: 8 }}>RECENT LOGS</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {node.logs.map((log, i) => (
            <div key={i} style={{
              fontSize: 9, lineHeight: 1.6,
              color: log.includes('[WARN]') ? '#F59E0B' : log.includes('[ERROR]') ? '#EF4444' : '#52525B',
              fontFamily: 'ui-monospace, monospace',
              padding: '4px 8px',
              background: '#0A0A0A',
              borderRadius: 3,
              borderLeft: `2px solid ${log.includes('[WARN]') ? '#F59E0B' : log.includes('[ERROR]') ? '#EF4444' : '#1A1A1A'}`,
            }}>{log}</div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function SystemGraph() {
  const [nodes, setNodes] = useState<SystemNode[]>(INITIAL_NODES)
  const [selected, setSelected] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const tickRef = useRef(0)

  // Live metric simulation
  useEffect(() => {
    const interval = setInterval(() => {
      tickRef.current++
      setTick(tickRef.current)
      setNodes(prev => prev.map(n => ({
        ...n,
        metrics: {
          latency: jitter(n.metrics.latency, 8),
          load: Math.min(99, Math.max(1, jitter(n.metrics.load, 4))),
          rps: Math.max(0, jitter(n.metrics.rps, n.metrics.rps * 0.05)),
          errors: Math.max(0, jitter(n.metrics.errors, 0.1)),
          uptime: n.metrics.uptime,
        },
      })))
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  const selectedNode = nodes.find(n => n.id === selected) ?? null

  // Global stats
  const liveCount = nodes.filter(n => n.status === 'live').length
  const degradedCount = nodes.filter(n => n.status === 'degraded').length
  const deadCount = nodes.filter(n => n.status === 'dead').length
  const totalRps = nodes.reduce((sum, n) => sum + n.metrics.rps, 0)
  const avgLatency = Math.round(nodes.reduce((sum, n) => sum + n.metrics.latency, 0) / nodes.length)
  const criticalAlerts = nodes.filter(n => n.status !== 'live' && n.critical).length

  // Canvas dimensions
  const canvasHeight = Math.max(...ZONE_ORDER.map(zone => {
    const count = nodes.filter(n => n.zone === zone).length
    return ZONE_PAD.top + count * (NODE_HEIGHT + NODE_GAP) + 20
  }))
  const canvasWidth = ZONE_ORDER.length * ZONE_WIDTH + 40

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      background: '#050505',
      fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
    }}>
      {/* ── Global system bar ── */}
      <div style={{
        background: '#0A0A0A',
        borderBottom: '1px solid #141414',
        padding: '10px 20px',
        display: 'flex', alignItems: 'center', gap: 0, flexShrink: 0,
      }}>
        {/* Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingRight: 24, borderRight: '1px solid #1A1A1A' }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: criticalAlerts > 0 ? '#EF4444' : degradedCount > 0 ? '#F59E0B' : '#10B981',
            boxShadow: `0 0 8px ${criticalAlerts > 0 ? '#EF4444' : degradedCount > 0 ? '#F59E0B' : '#10B981'}`,
          }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#E4E4E7', letterSpacing: '0.06em' }}>
            SYSTEM {criticalAlerts > 0 ? 'CRITICAL' : degradedCount > 0 ? 'DEGRADED' : 'STABLE'}
          </span>
        </div>

        {/* Stats */}
        {[
          { label: 'NODES', value: `${liveCount} / ${nodes.length}`, color: '#10B981' },
          { label: 'DEGRADED', value: String(degradedCount), color: degradedCount > 0 ? '#F59E0B' : '#3F3F46' },
          { label: 'CRITICAL ALERTS', value: String(criticalAlerts), color: criticalAlerts > 0 ? '#EF4444' : '#3F3F46' },
          { label: 'THROUGHPUT', value: `${fmtRps(totalRps)} req/s`, color: '#A1A1AA' },
          { label: 'AVG LATENCY', value: `${avgLatency} ms`, color: avgLatency > 100 ? '#F59E0B' : '#A1A1AA' },
        ].map(s => (
          <div key={s.label} style={{ paddingLeft: 24, paddingRight: 24, borderRight: '1px solid #1A1A1A' }}>
            <div style={{ fontSize: 7, color: '#3F3F46', letterSpacing: '0.1em', marginBottom: 2 }}>{s.label}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: s.color, fontVariantNumeric: 'tabular-nums' }}>{s.value}</div>
          </div>
        ))}

        <div style={{ marginLeft: 'auto', fontSize: 9, color: '#27272A' }}>
          LIVE · {new Date().toLocaleTimeString('sv-SE')} — tick #{tick}
        </div>
      </div>

      {/* ── Canvas + Detail ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Canvas */}
        <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
          <div style={{ position: 'relative', width: canvasWidth, minHeight: canvasHeight }}>

            {/* Zone bands */}
            {ZONE_ORDER.map((zone, zi) => {
              const cfg = ZONE_CONFIG[zone]
              const count = nodes.filter(n => n.zone === zone).length
              const h = ZONE_PAD.top + count * (NODE_HEIGHT + NODE_GAP) + 20
              return (
                <div key={zone} style={{
                  position: 'absolute',
                  left: zi * ZONE_WIDTH,
                  top: 0,
                  width: ZONE_WIDTH,
                  height: Math.max(canvasHeight, h),
                  borderRight: '1px solid #0F0F0F',
                  background: `${cfg.glow}`,
                }}>
                  <div style={{
                    position: 'absolute', top: 16, left: ZONE_PAD.left,
                    fontSize: 8, fontWeight: 800, color: cfg.color,
                    letterSpacing: '0.16em', opacity: 0.7,
                  }}>
                    {cfg.label}
                  </div>
                  <div style={{
                    position: 'absolute', top: 0, left: 0,
                    width: 3, height: '100%',
                    background: cfg.color, opacity: 0.15,
                  }} />
                </div>
              )
            })}

            {/* Edge SVG */}
            <div style={{ position: 'absolute', inset: 0 }}>
              <EdgeLayer nodes={nodes} edges={EDGES} selectedId={selected} />
            </div>

            {/* Nodes */}
            {nodes.map(node => {
              const pos = getNodePos(node, nodes)
              return (
                <div key={node.id} style={{
                  position: 'absolute',
                  left: pos.x,
                  top: pos.y,
                }}>
                  <NodeCard
                    node={node}
                    selected={selected === node.id}
                    onClick={() => setSelected(s => s === node.id ? null : node.id)}
                  />
                </div>
              )
            })}
          </div>
        </div>

        {/* Detail panel */}
        {selectedNode && (
          <DetailPanel node={selectedNode} onClose={() => setSelected(null)} />
        )}
      </div>

      {/* ── Bottom legend ── */}
      <div style={{
        background: '#0A0A0A', borderTop: '1px solid #141414',
        padding: '8px 20px', display: 'flex', alignItems: 'center', gap: 24, flexShrink: 0,
      }}>
        <div style={{ display: 'flex', gap: 16 }}>
          {[
            { color: '#10B981', dash: false, label: 'Critical path' },
            { color: '#1E1E1E', dash: true, label: 'Secondary' },
          ].map(e => (
            <div key={e.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="20" height="8">
                <line x1="0" y1="4" x2="20" y2="4"
                  stroke={e.color} strokeWidth={e.dash ? 1 : 2}
                  strokeDasharray={e.dash ? '3,3' : undefined}
                />
              </svg>
              <span style={{ fontSize: 9, color: '#3F3F46' }}>{e.label}</span>
            </div>
          ))}
        </div>
        <div style={{ width: 1, height: 12, background: '#1A1A1A' }} />
        <div style={{ display: 'flex', gap: 12 }}>
          {Object.entries(ZONE_CONFIG).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 8, height: 3, background: v.color, borderRadius: 1 }} />
              <span style={{ fontSize: 9, color: '#3F3F46' }}>{v.label}</span>
            </div>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 9, color: '#27272A' }}>
          ▲ corner = critical path node · click node for drill-down
        </div>
      </div>

      <style>{`
        @keyframes ping {
          75%, 100% { transform: scale(2.5); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
