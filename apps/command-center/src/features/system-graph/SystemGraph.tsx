import React, { useCallback, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
  Position,
  Handle,
  MarkerType,
  BackgroundVariant,
} from '@xyflow/react'
// CSS loaded via index.css for Cloudflare Pages compatibility

// ─── SEMANTIC COLOR SYSTEM ───────────────────────────────────────────────────
// Green  = Live/Active service
// Orange = Data/Storage
// Blue   = Core Logic/API
// Purple = Automation/Orchestration
// Gray   = Inactive/Not yet deployed
// Red    = Degraded/Critical

const COLORS = {
  live:        { bg: '#FFFFFF', border: '#16A34A', text: '#15803D', badge: '#DCFCE7', badgeText: '#166534' },
  data:        { bg: '#FFFFFF', border: '#EA580C', text: '#C2410C', badge: '#FFEDD5', badgeText: '#9A3412' },
  core:        { bg: '#FFFFFF', border: '#2563EB', text: '#1D4ED8', badge: '#DBEAFE', badgeText: '#1E40AF' },
  automation:  { bg: '#FFFFFF', border: '#7C3AED', text: '#6D28D9', badge: '#EDE9FE', badgeText: '#5B21B6' },
  inactive:    { bg: '#F9FAFB', border: '#D1D5DB', text: '#6B7280', badge: '#F3F4F6', badgeText: '#9CA3AF' },
  degraded:    { bg: '#FFF7F7', border: '#DC2626', text: '#B91C1C', badge: '#FEE2E2', badgeText: '#991B1B' },
  external:    { bg: '#FFFFFF', border: '#0891B2', text: '#0E7490', badge: '#CFFAFE', badgeText: '#155E75' },
}

type NodeColorKey = keyof typeof COLORS

// ─── CUSTOM NODE ─────────────────────────────────────────────────────────────

interface SystemNodeData {
  label: string
  sublabel?: string
  status: 'live' | 'degraded' | 'inactive' | 'pending'
  colorKey: NodeColorKey
  owner?: string
  latency?: string
  uptime?: string
  description?: string
}

const STATUS_DOT: Record<string, string> = {
  live:     '#16A34A',
  degraded: '#DC2626',
  inactive: '#9CA3AF',
  pending:  '#D97706',
}

function SystemNode({ data, selected }: { data: SystemNodeData; selected?: boolean }) {
  const c = COLORS[data.colorKey]
  const dotColor = STATUS_DOT[data.status]
  
  return (
    <div style={{
      background: c.bg,
      border: `1.5px solid ${selected ? '#111827' : c.border}`,
      borderRadius: 8,
      padding: '10px 14px',
      minWidth: 160,
      maxWidth: 220,
      boxShadow: selected ? '0 0 0 2px #111827' : '0 1px 4px rgba(0,0,0,0.08)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
      cursor: 'pointer',
      transition: 'box-shadow 0.15s',
    }}>
      <Handle type="target" position={Position.Left} style={{ background: c.border, width: 6, height: 6, border: 'none' }} />
      <Handle type="source" position={Position.Right} style={{ background: c.border, width: 6, height: 6, border: 'none' }} />
      
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#111827', lineHeight: 1.3, marginBottom: 2 }}>
            {data.label}
          </div>
          {data.sublabel && (
            <div style={{ fontSize: 10, color: '#6B7280', lineHeight: 1.3 }}>{data.sublabel}</div>
          )}
        </div>
        <div style={{
          width: 7, height: 7, borderRadius: '50%',
          background: dotColor, flexShrink: 0, marginTop: 3,
          boxShadow: data.status === 'live' ? `0 0 0 2px ${dotColor}33` : 'none',
        }} />
      </div>
      
      {(data.latency || data.uptime || data.owner) && (
        <div style={{ marginTop: 8, paddingTop: 7, borderTop: '1px solid rgba(0,0,0,0.06)', display: 'flex', flexWrap: 'wrap', gap: '3px 8px' }}>
          {data.owner && <span style={{ fontSize: 9, color: '#9CA3AF' }}>{data.owner}</span>}
          {data.latency && <span style={{ fontSize: 9, color: '#9CA3AF', fontFamily: 'monospace' }}>{data.latency}</span>}
          {data.uptime && <span style={{ fontSize: 9, color: '#9CA3AF', fontFamily: 'monospace' }}>{data.uptime}</span>}
        </div>
      )}
      
      <div style={{
        marginTop: 6,
        display: 'inline-block',
        padding: '1px 6px',
        borderRadius: 4,
        background: c.badge,
        fontSize: 9,
        fontWeight: 600,
        color: c.badgeText,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
      }}>
        {data.colorKey === 'live' ? 'Service' :
         data.colorKey === 'data' ? 'Data' :
         data.colorKey === 'core' ? 'API' :
         data.colorKey === 'automation' ? 'Automation' :
         data.colorKey === 'external' ? 'External' :
         data.colorKey === 'degraded' ? 'Degraded' : 'Inactive'}
      </div>
    </div>
  )
}

// ─── LAYER GROUP NODE ─────────────────────────────────────────────────────────

interface LayerNodeData {
  label: string
  sublabel?: string
}

function LayerNode({ data }: { data: LayerNodeData }) {
  return (
    <div style={{
      background: 'rgba(0,0,0,0.02)',
      border: '1px solid rgba(0,0,0,0.08)',
      borderRadius: 12,
      padding: '10px 16px 8px',
      fontFamily: '-apple-system, sans-serif',
      pointerEvents: 'none',
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        {data.label}
      </div>
      {data.sublabel && <div style={{ fontSize: 9, color: '#D1D5DB', marginTop: 1 }}>{data.sublabel}</div>}
    </div>
  )
}

// ─── NODE DEFINITIONS ─────────────────────────────────────────────────────────
// Layout: Left-to-right flow, top-to-bottom layers
// X position = layer (0 = leftmost = external, 900 = rightmost)
// Y position = vertical placement within layer

const INITIAL_NODES: Node[] = [
  // ── LAYER GROUPS (background containers) ──────────────────────────────────
  {
    id: 'layer-edge', type: 'layer',
    position: { x: -20, y: -40 }, data: { label: 'Edge Layer', sublabel: 'CDN · DNS · WAF' },
    style: { width: 220, height: 460, zIndex: -1 }, draggable: false, selectable: false,
  },
  {
    id: 'layer-compute', type: 'layer',
    position: { x: 230, y: -40 }, data: { label: 'Compute Layer', sublabel: 'AWS ECS Fargate · eu-north-1' },
    style: { width: 220, height: 700, zIndex: -1 }, draggable: false, selectable: false,
  },
  {
    id: 'layer-identity', type: 'layer',
    position: { x: 480, y: -40 }, data: { label: 'Identity & Auth', sublabel: 'RDS · DynamoDB · KMS' },
    style: { width: 220, height: 220, zIndex: -1 }, draggable: false, selectable: false,
  },
  {
    id: 'layer-data', type: 'layer',
    position: { x: 480, y: 210 }, data: { label: 'Data Layer', sublabel: 'Supabase · S3 · PostgreSQL' },
    style: { width: 220, height: 460, zIndex: -1 }, draggable: false, selectable: false,
  },
  {
    id: 'layer-automation', type: 'layer',
    position: { x: 730, y: -40 }, data: { label: 'Automation', sublabel: 'n8n · BOS Scheduler' },
    style: { width: 220, height: 220, zIndex: -1 }, draggable: false, selectable: false,
  },
  {
    id: 'layer-planned', type: 'layer',
    position: { x: 730, y: 210 }, data: { label: 'Planned', sublabel: 'Not yet deployed' },
    style: { width: 220, height: 460, zIndex: -1 }, draggable: false, selectable: false,
  },

  // ── EDGE LAYER ────────────────────────────────────────────────────────────
  {
    id: 'cloudflare', type: 'system',
    position: { x: 20, y: 20 },
    data: { label: 'Cloudflare', sublabel: 'DNS · WAF · CDN', status: 'live', colorKey: 'external', owner: 'Johan (CTO)', description: 'DNS, WAF, CDN for quixzoom.com + wavult.com' },
  },
  {
    id: 'cf-pages', type: 'system',
    position: { x: 20, y: 150 },
    data: { label: 'Cloudflare Pages', sublabel: 'wavult-os · landvex-eu · optical-insight', status: 'live', colorKey: 'external', owner: 'Johan', description: 'Static frontends, CDN-distributed globally' },
  },
  {
    id: 'alb', type: 'system',
    position: { x: 20, y: 280 },
    data: { label: 'ALB', sublabel: 'hypbit-api-alb · eu-north-1', status: 'live', colorKey: 'core', owner: 'Johan', latency: '42ms', description: 'Application Load Balancer routing API traffic' },
  },

  // ── COMPUTE LAYER ─────────────────────────────────────────────────────────
  {
    id: 'wavult-api', type: 'system',
    position: { x: 250, y: 20 },
    data: { label: 'Wavult OS API', sublabel: 'hypbit-api · Node.js · port 3001', status: 'live', colorKey: 'core', owner: 'Johan', latency: '42ms', uptime: '99.8%', description: 'Main Wavult OS backend. BOS tasks, auth, WHOOP.' },
  },
  {
    id: 'quixzoom-api', type: 'system',
    position: { x: 250, y: 160 },
    data: { label: 'QuiXzoom API', sublabel: 'quixzoom-api · Node.js', status: 'live', colorKey: 'core', owner: 'Johan', latency: '38ms', uptime: '99.1%', description: 'QuiXzoom platform: missions, zoomers, submissions' },
  },
  {
    id: 'wavult-core', type: 'system',
    position: { x: 250, y: 300 },
    data: { label: 'Wavult Core', sublabel: 'Financial Engine · port 3007', status: 'live', colorKey: 'core', owner: 'Johan', description: 'Split engine, fraud detection, event bus, state machine' },
  },
  {
    id: 'landvex-api', type: 'system',
    position: { x: 250, y: 440 },
    data: { label: 'Landvex API', sublabel: 'port 3006 · B2G platform', status: 'live', colorKey: 'core', owner: 'Johan', description: 'B2G API: /v1/objects, /v1/alerts, BOS webhooks' },
  },
  {
    id: 'identity-core', type: 'system',
    position: { x: 250, y: 580 },
    data: { label: 'Identity Core', sublabel: 'port 3005 · hybrid mode', status: 'live', colorKey: 'core', owner: 'Johan', description: 'Sovereign auth: Argon2id, JWT/KMS, session epochs' },
  },

  // ── IDENTITY & AUTH LAYER ─────────────────────────────────────────────────
  {
    id: 'rds', type: 'system',
    position: { x: 500, y: 20 },
    data: { label: 'RDS PostgreSQL', sublabel: 'wavult-identity-ecs · eu-north-1', status: 'live', colorKey: 'data', owner: 'Johan', description: 'Identity Core database: ic_users, ic_auth_events' },
  },
  {
    id: 'dynamo', type: 'system',
    position: { x: 500, y: 130 },
    data: { label: 'DynamoDB', sublabel: 'ic-sessions · ic-refresh-tokens', status: 'live', colorKey: 'data', owner: 'Johan', description: 'Session store with TTL. Strong consistent reads.' },
  },

  // ── DATA LAYER ────────────────────────────────────────────────────────────
  {
    id: 'supabase-wavult', type: 'system',
    position: { x: 500, y: 240 },
    data: { label: 'Supabase (Wavult OS)', sublabel: 'znmxtnxx · eu-west-1', status: 'live', colorKey: 'data', description: 'BOS tasks, events, audit log, team_locations.' },
  },
  {
    id: 'supabase-quixzoom', type: 'system',
    position: { x: 500, y: 380 },
    data: { label: 'Supabase (QuiXzoom)', sublabel: 'lpeipzdm · eu-west-1', status: 'live', colorKey: 'data', description: 'Missions, assignments, submissions, payouts.' },
  },
  {
    id: 's3-eu', type: 'system',
    position: { x: 500, y: 520 },
    data: { label: 'S3 EU', sublabel: 'wavult-images-eu-primary · eu-north-1', status: 'live', colorKey: 'data', description: 'EU primary image storage. CRR to eu-backup.' },
  },

  // ── AUTOMATION LAYER ──────────────────────────────────────────────────────
  {
    id: 'n8n', type: 'system',
    position: { x: 750, y: 20 },
    data: { label: 'n8n', sublabel: 'Automation · port 5678 · EFS', status: 'live', colorKey: 'automation', owner: 'Johan', description: 'Morning Brief, BOS webhooks, WHOOP sync, email via SES' },
  },
  {
    id: 'bos-scheduler', type: 'system',
    position: { x: 750, y: 140 },
    data: { label: 'BOS Scheduler', sublabel: '500ms loop · watchdog · audit', status: 'live', colorKey: 'automation', owner: 'Johan', description: 'Job queue: DEADLINE_CHECK (5m), RECONCILE (10m), FLOW (15m)' },
  },

  // ── PLANNED ───────────────────────────────────────────────────────────────
  {
    id: 'optical-insight', type: 'system',
    position: { x: 750, y: 240 },
    data: { label: 'Optical Insight', sublabel: 'NOT BUILT — Thailand Sprint', status: 'inactive', colorKey: 'inactive', description: 'AI image analysis engine for Landvex. Blocks B2G value chain.' },
  },
  {
    id: 'quixzoom-mobile', type: 'system',
    position: { x: 750, y: 380 },
    data: { label: 'QuiXzoom Mobile', sublabel: 'Expo RN · awaiting TestFlight', status: 'inactive', colorKey: 'inactive', description: 'Zoomer field app. Code ready, needs Apple Dev Account + EAS build.' },
  },
  {
    id: 'company-automation', type: 'system',
    position: { x: 750, y: 520 },
    data: { label: 'Company Automation', sublabel: 'Playwright · port 3008', status: 'live', colorKey: 'automation', description: 'Browser automation for company registration (Northwest, Stripe Atlas).' },
  },
]

// ─── EDGE DEFINITIONS ─────────────────────────────────────────────────────────
// Solid = sync/HTTP
// Dashed = async/event-driven

const makeEdge = (id: string, source: string, target: string, label: string, type: 'sync' | 'async' | 'data' = 'sync'): Edge => ({
  id,
  source,
  target,
  label,
  labelStyle: { fontSize: 9, fill: '#9CA3AF', fontFamily: 'monospace' },
  labelBgStyle: { fill: '#FFFFFF', fillOpacity: 0.9 },
  labelBgPadding: [3, 5] as [number, number],
  style: {
    stroke: type === 'async' ? '#A855F7' : type === 'data' ? '#EA580C' : '#94A3B8',
    strokeWidth: 1.5,
    strokeDasharray: type === 'async' ? '5,3' : undefined,
  },
  markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12, color: type === 'async' ? '#A855F7' : type === 'data' ? '#EA580C' : '#94A3B8' },
  type: 'smoothstep',
  animated: type === 'async',
})

const INITIAL_EDGES: Edge[] = [
  // Edge → Compute
  makeEdge('e1', 'cloudflare', 'cf-pages', 'DNS', 'sync'),
  makeEdge('e2', 'cloudflare', 'alb', 'Route', 'sync'),
  makeEdge('e3', 'alb', 'wavult-api', 'api.wavult.com', 'sync'),
  makeEdge('e4', 'alb', 'quixzoom-api', 'api.quixzoom.com', 'sync'),
  makeEdge('e5', 'alb', 'identity-core', '/v1/auth/*', 'sync'),
  makeEdge('e6', 'alb', 'n8n', '/n8n/*', 'sync'),

  // Compute → Data
  makeEdge('e7', 'wavult-api', 'supabase-wavult', 'bos_tasks', 'data'),
  makeEdge('e8', 'quixzoom-api', 'supabase-quixzoom', 'missions', 'data'),
  makeEdge('e9', 'quixzoom-api', 's3-eu', 'media upload', 'data'),
  makeEdge('e10', 'identity-core', 'rds', 'ic_users', 'data'),
  makeEdge('e11', 'identity-core', 'dynamo', 'sessions', 'data'),
  makeEdge('e12', 'wavult-core', 'supabase-wavult', 'financial_events', 'async'),

  // Automation
  makeEdge('e13', 'bos-scheduler', 'supabase-wavult', 'bos_jobs poll', 'async'),
  makeEdge('e14', 'bos-scheduler', 'n8n', 'webhooks', 'async'),
  makeEdge('e15', 'n8n', 'wavult-api', 'triggers', 'async'),

  // Planned
  makeEdge('e16', 'quixzoom-api', 'optical-insight', 'images', 'async'),
  makeEdge('e17', 'landvex-api', 'optical-insight', 'alerts', 'async'),
]

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

const nodeTypes = { system: SystemNode, layer: LayerNode }

export function SystemGraph() {
  const [nodes, , onNodesChange] = useNodesState(INITIAL_NODES)
  const [edges, setEdges, onEdgesChange] = useEdgesState(INITIAL_EDGES)
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)

  const onConnect = useCallback(
    (connection: Connection) => setEdges(eds => addEdge(connection, eds)),
    [setEdges]
  )

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    if (node.type === 'layer') return
    setSelectedNode(prev => prev?.id === node.id ? null : node)
  }, [])

  const selectedData = selectedNode?.data as unknown as SystemNodeData | undefined

  const liveCount = nodes.filter(n => n.type === 'system' && (n.data as unknown as SystemNodeData).status === 'live').length
  const degradedCount = nodes.filter(n => n.type === 'system' && (n.data as unknown as SystemNodeData).status === 'degraded').length
  const inactiveCount = nodes.filter(n => n.type === 'system' && (n.data as unknown as SystemNodeData).status === 'inactive').length

  return (
    <div style={{ height: '100%', display: 'flex', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      {/* Graph */}
      <div style={{ flex: 1, position: 'relative' }}>
        {/* Status bar */}
        <div style={{
          position: 'absolute', top: 12, left: 12, zIndex: 10,
          background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)',
          border: '1px solid rgba(0,0,0,0.1)', borderRadius: 8,
          padding: '8px 12px', display: 'flex', gap: 16, alignItems: 'center',
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#111827', letterSpacing: '0.05em' }}>WAVULT SYSTEM</span>
          <div style={{ width: 1, height: 14, background: '#E5E7EB' }} />
          {[
            { color: '#16A34A', label: `${liveCount} Live` },
            { color: '#DC2626', label: `${degradedCount} Degraded` },
            { color: '#9CA3AF', label: `${inactiveCount} Planned` },
          ].map(({ color, label }) => (
            <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#374151' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: color }} />
              {label}
            </span>
          ))}
        </div>

        {/* Legend */}
        <div style={{
          position: 'absolute', bottom: 12, left: 12, zIndex: 10,
          background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)',
          border: '1px solid rgba(0,0,0,0.1)', borderRadius: 8,
          padding: '10px 12px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 7 }}>Edge types</div>
          {[
            { style: '1.5px solid #94A3B8', label: 'Sync (HTTP)' },
            { style: '1.5px dashed #A855F7', label: 'Async (Event)' },
            { style: '1.5px solid #EA580C', label: 'Data flow' },
          ].map(({ style, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
              <div style={{ width: 28, borderTop: style }} />
              <span style={{ fontSize: 10, color: '#6B7280' }}>{label}</span>
            </div>
          ))}
        </div>

        <div style={{ width: '100%', height: '100%', minHeight: 600 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          minZoom={0.2}
          maxZoom={2}
          defaultEdgeOptions={{ type: 'smoothstep' }}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#E5E7EB" />
          <Controls showInteractive={false} style={{ bottom: 12, right: 12, top: 'auto', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.1)' }} />
          <MiniMap
            style={{ bottom: 12, right: 60, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.1)' }}
            nodeColor={(n) => {
              const d = n.data as unknown as SystemNodeData
              return d?.status === 'live' ? '#16A34A' : d?.status === 'degraded' ? '#DC2626' : '#D1D5DB'
            }}
            maskColor="rgba(255,255,255,0.7)"
          />
        </ReactFlow>
        </div>
      </div>

      {/* Detail panel */}
      {selectedNode && selectedData && (
        <div style={{
          width: 300, borderLeft: '1px solid rgba(0,0,0,0.08)',
          background: '#FFFFFF', padding: '20px 20px', overflowY: 'auto',
          display: 'flex', flexDirection: 'column', gap: 16,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{selectedData.label}</div>
              <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{selectedData.sublabel}</div>
            </div>
            <button onClick={() => setSelectedNode(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: 18, lineHeight: 1, padding: 2 }}>×</button>
          </div>

          <div style={{ padding: '10px 12px', background: '#F9FAFB', borderRadius: 8, fontSize: 12, color: '#374151', lineHeight: 1.6 }}>
            {selectedData.description || 'No description available.'}
          </div>

          {(selectedData.owner || selectedData.latency || selectedData.uptime) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {selectedData.owner && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}><span style={{ color: '#9CA3AF' }}>Owner</span><span style={{ color: '#374151', fontWeight: 500 }}>{selectedData.owner}</span></div>}
              {selectedData.latency && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}><span style={{ color: '#9CA3AF' }}>Latency</span><span style={{ color: '#374151', fontFamily: 'monospace' }}>{selectedData.latency}</span></div>}
              {selectedData.uptime && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}><span style={{ color: '#9CA3AF' }}>Uptime 30d</span><span style={{ color: '#374151', fontFamily: 'monospace' }}>{selectedData.uptime}</span></div>}
            </div>
          )}

          <div style={{ display: 'flex', gap: 6 }}>
            <span style={{
              padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
              background: selectedData.status === 'live' ? '#DCFCE7' : selectedData.status === 'degraded' ? '#FEE2E2' : '#F3F4F6',
              color: selectedData.status === 'live' ? '#166534' : selectedData.status === 'degraded' ? '#991B1B' : '#6B7280',
            }}>
              {selectedData.status.toUpperCase()}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

