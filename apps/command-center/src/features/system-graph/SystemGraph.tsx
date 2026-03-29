import React, { useState, useEffect, useRef } from 'react'
import { Activity, Server, Database, Globe, Zap, ChevronRight, X } from 'lucide-react'

// ─── DATA MODEL ──────────────────────────────────────────────────────────────

type NodeType = 'service' | 'database' | 'storage' | 'cdn' | 'external' | 'scheduler'
type NodeStatus = 'healthy' | 'degraded' | 'down' | 'unknown'

interface BusinessContext {
  domain: 'Customer Experience' | 'Core Services' | 'Data Layer' | 'Automation' | 'Infrastructure' | 'Security'
  capability: string
  ownerTeam: string
  whatIsThis: string
  whyItExists: string
  dependedOnBy: string[]
}

interface SystemNode {
  id: string
  label: string
  type: NodeType
  status: NodeStatus
  region?: string
  latencyMs?: number
  uptimePct?: number
  connects: string[]
  details?: Record<string, string | number>
  businessContext?: BusinessContext
  domainGroup?: 'customer' | 'core' | 'data' | 'automation' | 'infra' | 'security'
}

interface Connection {
  from: string
  to: string
  active: boolean
  throughput?: 'high' | 'medium' | 'low'
  label?: string
}

// ─── SYSTEM MAP (canonical model) ────────────────────────────────────────────

const NODES: SystemNode[] = ([
  // Edge / Customer Experience
  {
    id: 'cloudflare',
    label: 'Cloudflare',
    type: 'cdn',
    status: 'healthy',
    connects: ['alb', 'cf-pages'],
    details: { 'Zones': 4, 'DNS': 'active' },
    domainGroup: 'customer',
    businessContext: {
      domain: 'Customer Experience',
      capability: 'Global CDN & DNS',
      ownerTeam: 'Johan (CTO)',
      whatIsThis: 'Routes all internet traffic into the Wavult infrastructure. Provides DDoS protection, CDN caching and DNS for all domains.',
      whyItExists: 'Without this, no user can reach any Wavult product — websites, APIs or dashboards.',
      dependedOnBy: [],
    },
  },
  {
    id: 'cf-pages',
    label: 'Cloudflare Pages',
    type: 'cdn',
    status: 'healthy',
    connects: [],
    details: { 'wavult-os': 'live', 'landvex-eu': 'live', 'optical-insight-eu': 'live' },
    domainGroup: 'customer',
    businessContext: {
      domain: 'Customer Experience',
      capability: 'Frontend Hosting',
      ownerTeam: 'Erik (CEO)',
      whatIsThis: 'Hosts all frontend web apps: Wavult OS dashboard, landing pages and future customer portals.',
      whyItExists: 'Without this, users have no UI to interact with — the product is invisible.',
      dependedOnBy: ['cloudflare'],
    },
  },

  // Core Services
  {
    id: 'alb',
    label: 'Load Balancer',
    type: 'service',
    status: 'healthy',
    region: 'eu-north-1',
    connects: ['hypbit-api', 'quixzoom-api', 'n8n', 'bos-scheduler'],
    domainGroup: 'core',
    businessContext: {
      domain: 'Core Services',
      capability: 'Traffic Distribution',
      ownerTeam: 'Johan (CTO)',
      whatIsThis: 'AWS Application Load Balancer that routes traffic to the correct backend service based on URL path.',
      whyItExists: 'Without this, traffic from Cloudflare has nowhere to go — all APIs go down.',
      dependedOnBy: ['cloudflare', 'github-actions'],
    },
  },
  {
    id: 'hypbit-api',
    label: 'Wavult OS API',
    type: 'service',
    status: 'healthy',
    region: 'eu-north-1',
    latencyMs: 42,
    uptimePct: 99.2,
    connects: ['supabase-wavult', 'dynamo'],
    details: { 'Task': 'hypbit-api:34', 'Port': 3001 },
    domainGroup: 'core',
    businessContext: {
      domain: 'Core Services',
      capability: 'Enterprise OS Backend',
      ownerTeam: 'Johan (CTO)',
      whatIsThis: 'The central backend for Wavult OS. Handles all business logic, user management and system state.',
      whyItExists: 'Without this, the entire Wavult OS dashboard is unavailable.',
      dependedOnBy: ['cf-pages', 'bos-scheduler'],
    },
  },
  {
    id: 'quixzoom-api',
    label: 'QuixZoom API',
    type: 'service',
    status: 'healthy',
    region: 'eu-north-1',
    latencyMs: 38,
    uptimePct: 99.1,
    connects: ['supabase-quixzoom', 's3-eu'],
    details: { 'Task': 'quixzoom-api:6', 'Port': 3001 },
    domainGroup: 'core',
    businessContext: {
      domain: 'Core Services',
      capability: 'Camera Platform Backend',
      ownerTeam: 'Johan (CTO)',
      whatIsThis: 'Backend for QuixZoom — the crowdsourced camera network. Handles photographer assignments, image uploads and mission dispatch.',
      whyItExists: 'Without this, photographers cannot receive jobs and clients cannot order captures.',
      dependedOnBy: ['alb'],
    },
  },
  {
    id: 'identity-core',
    label: 'Identity Core',
    type: 'service',
    status: 'unknown',
    region: 'eu-north-1',
    connects: ['rds', 'dynamo', 'kms'],
    details: { 'Status': 'Parallel build', 'Migration': 'Pending order' },
    domainGroup: 'core',
    businessContext: {
      domain: 'Core Services',
      capability: 'User Authentication',
      ownerTeam: 'Johan (CTO)',
      whatIsThis: 'Centralized auth service for all Wavult products. Will replace Supabase Auth with JWT signing via KMS.',
      whyItExists: 'Without this, users across all products cannot authenticate securely at scale.',
      dependedOnBy: [],
    },
  },

  // Automation
  {
    id: 'n8n',
    label: 'n8n Automation',
    type: 'service',
    status: 'healthy',
    region: 'eu-north-1',
    connects: ['ses'],
    details: { 'Task': 'n8n-task:5', 'Port': 5678, 'EFS': 'mounted' },
    domainGroup: 'automation',
    businessContext: {
      domain: 'Automation',
      capability: 'Workflow Automation',
      ownerTeam: 'Erik (CEO)',
      whatIsThis: 'No-code workflow engine. Runs automated tasks: Morning Brief emails, internal alerts, integrations with external services.',
      whyItExists: 'Without this, all automated business workflows stop — Morning Brief goes silent.',
      dependedOnBy: ['alb'],
    },
  },
  {
    id: 'bos-scheduler',
    label: 'BOS Scheduler',
    type: 'scheduler',
    status: 'healthy',
    region: 'eu-north-1',
    connects: ['supabase-wavult'],
    details: { 'Task': 'bos-scheduler:2', 'Loop': '500ms', 'Watchdog': 'active' },
    domainGroup: 'automation',
    businessContext: {
      domain: 'Automation',
      capability: 'Job Scheduling',
      ownerTeam: 'Johan (CTO)',
      whatIsThis: 'Business Operating System scheduler. Runs a 500ms loop to process BOS tasks, jobs and events from the database.',
      whyItExists: 'Without this, all scheduled business operations halt — tasks queue up but never execute.',
      dependedOnBy: ['alb'],
    },
  },

  // Data Layer
  {
    id: 'supabase-wavult',
    label: 'DB (Wavult OS)',
    type: 'database',
    status: 'degraded',
    region: 'eu-west-1',
    connects: [],
    details: { 'Plan': 'Free ⚠️', 'ID': 'znmxtnxx...', 'Tables': 'bos_tasks, bos_jobs, bos_events' },
    domainGroup: 'data',
    businessContext: {
      domain: 'Data Layer',
      capability: 'Primary Database',
      ownerTeam: 'Johan (CTO)',
      whatIsThis: 'Stores all Wavult OS data: tasks, team, sessions, audit logs.',
      whyItExists: 'Without this, no data can be saved or retrieved in Wavult OS.',
      dependedOnBy: ['hypbit-api', 'bos-scheduler'],
    },
  },
  {
    id: 'supabase-quixzoom',
    label: 'DB (QuixZoom)',
    type: 'database',
    status: 'degraded',
    region: 'eu-west-1',
    connects: [],
    details: { 'Plan': 'Free ⚠️', 'ID': 'lpeipzdm...' },
    domainGroup: 'data',
    businessContext: {
      domain: 'Data Layer',
      capability: 'QuixZoom Database',
      ownerTeam: 'Johan (CTO)',
      whatIsThis: 'Stores all QuixZoom data: photographers, missions, deliveries and client records.',
      whyItExists: 'Without this, QuixZoom cannot store or retrieve any photographer or mission data.',
      dependedOnBy: ['quixzoom-api'],
    },
  },
  {
    id: 'rds',
    label: 'RDS PostgreSQL',
    type: 'database',
    status: 'unknown',
    region: 'eu-north-1',
    connects: [],
    details: { 'Status': 'Not provisioned', 'For': 'Identity Core' },
    domainGroup: 'data',
    businessContext: {
      domain: 'Data Layer',
      capability: 'Identity Database',
      ownerTeam: 'Johan (CTO)',
      whatIsThis: 'Managed PostgreSQL database for Identity Core. Will store all user accounts, roles and auth credentials.',
      whyItExists: 'Without this, Identity Core cannot store user data and authentication will not function.',
      dependedOnBy: ['identity-core'],
    },
  },
  {
    id: 'dynamo',
    label: 'DynamoDB Sessions',
    type: 'database',
    status: 'unknown',
    region: 'eu-north-1',
    connects: [],
    details: { 'Tables': 'ic-sessions, ic-tokens', 'Status': 'Not provisioned' },
    domainGroup: 'data',
    businessContext: {
      domain: 'Data Layer',
      capability: 'Session Store',
      ownerTeam: 'Johan (CTO)',
      whatIsThis: 'DynamoDB tables for storing active user sessions and refresh tokens at high speed.',
      whyItExists: 'Without this, Identity Core cannot track logged-in users and all sessions expire immediately.',
      dependedOnBy: ['identity-core', 'hypbit-api'],
    },
  },

  // Infrastructure
  {
    id: 's3-eu',
    label: 'S3 EU Primary',
    type: 'storage',
    status: 'healthy',
    region: 'eu-north-1',
    connects: ['s3-eu-backup'],
    details: { 'Bucket': 'wavult-images-eu-primary', 'CRR': 'active' },
    domainGroup: 'infra',
    businessContext: {
      domain: 'Infrastructure',
      capability: 'Image Storage Primary',
      ownerTeam: 'Johan (CTO)',
      whatIsThis: 'Primary S3 bucket for all QuixZoom image uploads. Replicates automatically to backup bucket.',
      whyItExists: 'Without this, photographers cannot upload images and clients receive no deliverables.',
      dependedOnBy: ['quixzoom-api'],
    },
  },
  {
    id: 's3-eu-backup',
    label: 'S3 EU Backup',
    type: 'storage',
    status: 'healthy',
    region: 'eu-west-1',
    connects: [],
    details: { 'Bucket': 'wavult-images-eu-backup', 'Class': 'STANDARD_IA' },
    domainGroup: 'infra',
    businessContext: {
      domain: 'Infrastructure',
      capability: 'Image Storage Backup',
      ownerTeam: 'Johan (CTO)',
      whatIsThis: 'Cross-region backup for all QuixZoom images. Stores data in STANDARD_IA for cost efficiency.',
      whyItExists: 'Without this, a regional AWS outage could permanently destroy all uploaded images.',
      dependedOnBy: ['s3-eu'],
    },
  },
  {
    id: 'ses',
    label: 'AWS SES',
    type: 'external',
    status: 'healthy',
    connects: [],
    details: { 'Region': 'eu-north-1', 'Usage': 'Morning Brief' },
    domainGroup: 'infra',
    businessContext: {
      domain: 'Infrastructure',
      capability: 'Email Delivery',
      ownerTeam: 'Erik (CEO)',
      whatIsThis: 'Amazon Simple Email Service. Sends transactional emails: Morning Brief, alerts and system notifications.',
      whyItExists: 'Without this, no automated emails are sent — Morning Brief and alert notifications stop.',
      dependedOnBy: ['n8n'],
    },
  },
  {
    id: 'kms',
    label: 'AWS KMS',
    type: 'external',
    status: 'unknown',
    region: 'eu-north-1',
    connects: [],
    details: { 'Usage': 'Identity Core JWT signing', 'Status': 'Not configured' },
    domainGroup: 'infra',
    businessContext: {
      domain: 'Infrastructure',
      capability: 'Cryptographic Key Management',
      ownerTeam: 'Johan (CTO)',
      whatIsThis: 'AWS Key Management Service for signing JWTs and encrypting sensitive identity data.',
      whyItExists: 'Without this, Identity Core cannot issue secure tokens — authentication is insecure.',
      dependedOnBy: ['identity-core'],
    },
  },
  {
    id: 'github-actions',
    label: 'GitHub Actions',
    type: 'external',
    status: 'healthy',
    connects: ['alb'],
    details: { 'Repo': 'wolfoftyreso-debug/hypbit', 'Branch': 'main' },
    domainGroup: 'infra',
    businessContext: {
      domain: 'Infrastructure',
      capability: 'CI/CD Pipeline',
      ownerTeam: 'Johan (CTO)',
      whatIsThis: 'Automated build and deploy pipeline. On every push to main, builds and deploys all services to ECS.',
      whyItExists: 'Without this, code changes must be deployed manually — releases slow to a crawl.',
      dependedOnBy: [],
    },
  },
  // ─── NODES THAT SHOULD EXIST (Node Registry — MISSING state) ─────────────────
  {
    id: 'landvex-api',
    label: 'Landvex API',
    type: 'service' as const,
    status: 'unknown' as const,
    domainGroup: 'core' as const,
    connects: ['supabase-wavult', 'alb'],

    businessContext: {
      domain: 'Core Services' as const,
      capability: 'B2G Platform Backend',
      ownerTeam: 'Johan (CTO)',
      whatIsThis: 'The backend API for Landvex — the B2G platform selling to municipalities. Handles inspection data, alerts, and customer management.',
      whyItExists: 'Without this, Landvex cannot serve municipalities or process optical insight data.',
      dependedOnBy: ['alb'],
    },
    details: { 'Status': '⚫ NOT DEPLOYED', 'Priority': 'Required for Sverige-lansering Juni 2026', 'ECS Service': 'Not created yet' },
  },
  {
    id: 'landvex-portal',
    label: 'Landvex Portal',
    type: 'cdn' as const,
    status: 'unknown' as const,
    domainGroup: 'customer' as const,
    connects: ['landvex-api'],
    businessContext: {
      domain: 'Customer Experience' as const,
      capability: 'B2G Customer Portal',
      ownerTeam: 'Johan (CTO)',
      whatIsThis: 'The Landvex web portal where municipalities log in to view infrastructure alerts, reports and inspection status.',
      whyItExists: 'Without this, municipality customers have no interface to use Landvex.',
      dependedOnBy: [],
    },
    details: { 'URL': 'landvex-eu.pages.dev', 'Status': 'Static site live, backend not connected', 'CF Pages': 'active' },
  },
  {
    id: 'optical-insight',
    label: 'Optical Insight Engine',
    type: 'service' as const,
    status: 'unknown' as const,
    domainGroup: 'core' as const,
    connects: ['s3-eu', 'supabase-quixzoom'],
    businessContext: {
      domain: 'Core Services' as const,
      capability: 'Vision Analysis Engine',
      ownerTeam: 'Johan (CTO)',
      whatIsThis: 'The core AI analysis engine that processes QuiXzoom images, detects infrastructure anomalies, and generates alerts for Landvex customers.',
      whyItExists: 'Without this, raw zoomer images are just images — no value to municipalities.',
      dependedOnBy: ['landvex-api'],
    },
    details: { 'Status': '⚫ NOT BUILT', 'Planned': 'Thailand Workcamp Sprint', 'Blocks': 'Entire Landvex value chain' },
  },
  {
    id: 'quixzoom-mobile',
    label: 'QuiXzoom Mobile App',
    type: 'cdn' as const,
    status: 'unknown' as const,
    domainGroup: 'customer' as const,
    connects: ['quixzoom-api'],
    businessContext: {
      domain: 'Customer Experience' as const,
      capability: 'Zoomer Field App (iOS/Android)',
      ownerTeam: 'Johan (CTO)',
      whatIsThis: 'The React Native mobile app used by Zoomers to receive assignments, capture geo-tagged images and submit to the QuiXzoom platform.',
      whyItExists: 'Without this, there are no Zoomers and no data — the entire QuiXzoom business model fails.',
      dependedOnBy: ['quixzoom-api'],
    },
    details: { 'Status': '⚫ NOT IN TESTFLIGHT', 'Code': 'Ready (Expo RN)', 'Blocker': 'Apple Developer Account + EAS Build needed' },
  },
] as SystemNode[])

// ─── LAYOUT ───────────────────────────────────────────────────────────────────

const POSITIONS: Record<string, { x: number; y: number }> = {
  'github-actions':     { x: 60, y: 20 },
  'cloudflare':         { x: 300, y: 20 },
  'cf-pages':           { x: 120, y: 120 },
  'alb':                { x: 480, y: 120 },
  'hypbit-api':         { x: 280, y: 240 },
  'quixzoom-api':       { x: 480, y: 240 },
  'n8n':                { x: 680, y: 240 },
  'bos-scheduler':      { x: 680, y: 360 },
  'identity-core':      { x: 80, y: 360 },
  'supabase-wavult':    { x: 200, y: 460 },
  'supabase-quixzoom':  { x: 440, y: 460 },
  'rds':                { x: 60, y: 540 },
  'dynamo':             { x: 200, y: 560 },
  's3-eu':              { x: 560, y: 460 },
  's3-eu-backup':       { x: 720, y: 540 },
  'ses':                { x: 820, y: 240 },
  'kms':                { x: 60, y: 460 },
  'landvex-api':        { x: 550, y: 560 },
  'landvex-portal':     { x: 400, y: 630 },
  'optical-insight':    { x: 700, y: 560 },
  'quixzoom-mobile':    { x: 220, y: 630 },
}

// ─── DOMAIN GROUPS ───────────────────────────────────────────────────────────

const DOMAIN_GROUPS = [
  { id: 'customer',   label: 'CUSTOMER EXPERIENCE', color: '#007AFF', nodes: ['cloudflare', 'cf-pages'] },
  { id: 'core',       label: 'CORE SERVICES',        color: '#5856D6', nodes: ['alb', 'hypbit-api', 'quixzoom-api', 'identity-core'] },
  { id: 'automation', label: 'AUTOMATION',            color: '#FF9500', nodes: ['n8n', 'bos-scheduler'] },
  { id: 'data',       label: 'DATA LAYER',            color: '#34C759', nodes: ['supabase-wavult', 'supabase-quixzoom', 'rds', 'dynamo'] },
  { id: 'infra',      label: 'INFRASTRUCTURE',        color: '#FF3B30', nodes: ['s3-eu', 's3-eu-backup', 'ses', 'kms', 'github-actions'] },
]

function getGroupBounds(nodeIds: string[]): { x: number; y: number; w: number; h: number } | null {
  const positions = nodeIds.map(id => POSITIONS[id]).filter(Boolean)
  if (!positions.length) return null
  const xs = positions.map(p => p.x)
  const ys = positions.map(p => p.y)
  const padding = 20
  return {
    x: Math.min(...xs) - padding,
    y: Math.min(...ys) - padding,
    w: Math.max(...xs) + 120 + padding - (Math.min(...xs) - padding),
    h: Math.max(...ys) + 44 + padding - (Math.min(...ys) - padding),
  }
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<NodeStatus, { bg: string; border: string; text: string; dot: string }> = {
  healthy:  { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-800', dot: '#10B981' },
  degraded: { bg: 'bg-amber-50',   border: 'border-amber-300',   text: 'text-amber-800',   dot: '#F59E0B' },
  down:     { bg: 'bg-red-50',     border: 'border-red-300',     text: 'text-red-800',     dot: '#EF4444' },
  unknown:  { bg: 'bg-gray-50',    border: 'border-gray-300',    text: 'text-gray-500',    dot: '#1C1C1E' }, // ⚫ MISSING/NOT DEPLOYED
}

const TYPE_COLORS: Record<NodeType, string> = {
  service:   '#007AFF',
  database:  '#5856D6',
  storage:   '#34C759',
  cdn:       '#FF9500',
  external:  '#8E8E93',
  scheduler: '#FF9500',
}

const TYPE_ICONS: Record<NodeType, React.ComponentType<{ className?: string }>> = {
  service:   Server,
  database:  Database,
  storage:   Database,
  cdn:       Globe,
  external:  Zap,
  scheduler: Activity,
}

function StatusDot({ status, pulse = false }: { status: NodeStatus; pulse?: boolean }) {
  const color = STATUS_COLORS[status].dot
  return (
    <span className="relative flex h-2.5 w-2.5">
      {pulse && status === 'healthy' && (
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
          style={{ backgroundColor: color }} />
      )}
      <span className="relative inline-flex rounded-full h-2.5 w-2.5"
        style={{ backgroundColor: color }} />
    </span>
  )
}

// ─── ERROR BOUNDARY ───────────────────────────────────────────────────────────

class SystemGraphErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full bg-gray-50">
          <div className="text-center p-8">
            <div className="text-gray-400 text-sm">System Graph unavailable</div>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm"
            >
              Retry
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export function SystemGraph() {
  return (
    <SystemGraphErrorBoundary>
      <SystemGraphInner />
    </SystemGraphErrorBoundary>
  )
}

function SystemGraphInner() {
  const [nodes, setNodes] = useState<SystemNode[]>(NODES)
  const [selected, setSelected] = useState<SystemNode | null>(null)
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const [animTick, setAnimTick] = useState(0)
  const [hoveredConnection, setHoveredConnection] = useState<string | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const svgRef = useRef<SVGSVGElement>(null)

  // Pulse animation tick
  useEffect(() => {
    const t = setInterval(() => setAnimTick(n => n + 1), 1500)
    return () => clearInterval(t)
  }, [])

  // Simulate live health check (replace with real fetch in prod)
  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('https://api.hypbit.com/health', { signal: AbortSignal.timeout(5000) })
        setNodes(prev => prev.map(n =>
          n.id === 'hypbit-api' ? { ...n, status: res.ok ? 'healthy' : 'degraded' } : n
        ))
      } catch {
        setNodes(prev => prev.map(n =>
          n.id === 'hypbit-api' ? { ...n, status: 'degraded' } : n
        ))
      }
      setLastUpdated(new Date())
    }
    check()
    const t = setInterval(check, 30000)
    return () => clearInterval(t)
  }, [])

  // Filter to only nodes that have a defined position (guards against undefined nodes in array)
  const renderableNodes = nodes.filter(n => n != null && POSITIONS[n.id] !== undefined)
  const nodeMap = new Map(nodes.filter(n => n != null).map(n => [n.id, n]))

  // Build connections
  const connections: Connection[] = []
  renderableNodes.forEach(node => {
    node.connects.forEach(targetId => {
      if (nodeMap.has(targetId) && POSITIONS[node.id] && POSITIONS[targetId]) {
        const fromNode = node
        const toNode = nodeMap.get(targetId)!
        const connLabel = `${fromNode.label} → ${toNode.label}`
        connections.push({
          from: node.id,
          to: targetId,
          active: node.status === 'healthy' && (nodeMap.get(targetId)?.status !== 'down'),
          throughput: node.id === 'cloudflare' || node.id === 'alb' ? 'high' : 'medium',
          label: connLabel,
        })
      }
    })
  })

  const safeNodes = nodes.filter(n => n != null)
  const statusCounts = {
    healthy:  safeNodes.filter(n => n.status === 'healthy').length,
    degraded: safeNodes.filter(n => n.status === 'degraded').length,
    down:     safeNodes.filter(n => n.status === 'down').length,
    unknown:  safeNodes.filter(n => n.status === 'unknown').length,
  }

  const viewW = 900
  const viewH = 640

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200">
        <div className="flex items-center gap-6 text-sm">
          <span className="font-semibold text-gray-900">System Graph</span>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-600">
            <span className="font-mono font-bold">{safeNodes.filter(n => n.status !== 'unknown').length}/{safeNodes.length}</span>
            <span>deployed</span>
            {safeNodes.filter(n => n.status === 'unknown').length > 0 && (
              <span className="ml-1 text-gray-400">· {safeNodes.filter(n => n.status === 'unknown').length} missing</span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />{statusCounts.healthy} live
            </span>
            <span className="flex items-center gap-1.5 text-amber-700">
              <span className="w-2 h-2 rounded-full bg-amber-400" />{statusCounts.degraded} degraded
            </span>
            <span className="flex items-center gap-1.5 text-gray-500">
              <span className="w-2 h-2 rounded-full bg-gray-400" />{statusCounts.unknown} not provisioned
            </span>
          </div>
        </div>
        <span className="text-xs text-gray-400 font-mono">
          Updated {lastUpdated.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
      </div>

      {/* Graph area */}
      <div
        className="flex-1 overflow-hidden relative"
        onMouseMove={e => {
          const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
          setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
        }}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${viewW} ${viewH}`}
          className="w-full h-full"
          style={{ background: '#F8FAFC' }}
        >
          {/* Defs */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#E2E8F0" strokeWidth="0.5" />
            </pattern>
            <marker id="arrow" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L6,3 z" fill="#94A3B8" />
            </marker>
            <marker id="arrow-active" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L6,3 z" fill="#10B981" />
            </marker>
          </defs>
          <rect width={viewW} height={viewH} fill="url(#grid)" />

          {/* Domain group backgrounds */}
          {DOMAIN_GROUPS.map(group => {
            const bounds = getGroupBounds(group.nodes)
            if (!bounds) return null
            return (
              <g key={group.id}>
                <rect
                  x={bounds.x} y={bounds.y} width={bounds.w} height={bounds.h}
                  rx={12} fill={group.color} fillOpacity={0.04}
                  stroke={group.color} strokeOpacity={0.15} strokeWidth={1}
                />
                <text
                  x={bounds.x + 12} y={bounds.y + 14}
                  fontSize={9} fontWeight={700}
                  fill={group.color} fillOpacity={0.6}
                  fontFamily="system-ui" letterSpacing="0.08em"
                >
                  {group.label}
                </text>
              </g>
            )
          })}

          {/* Connections */}
          {connections.map(conn => {
            const from = POSITIONS[conn.from]
            const to = POSITIONS[conn.to]
            if (!from || !to) return null
            const dx = (to.x + 60) - (from.x + 60)
            const dy = (to.y + 20) - (from.y + 20)
            void dy
            const d = `M ${from.x + 60} ${from.y + 22} C ${from.x + 60 + dx/2} ${from.y + 22} ${to.x + 60 - dx/2} ${to.y + 22} ${to.x + 60} ${to.y + 22}`
            const connKey = `${conn.from}-${conn.to}`
            return (
              <g key={connKey}>
                {/* Invisible wider hit area */}
                <path
                  d={d}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={12}
                  style={{ cursor: 'crosshair' }}
                  onMouseEnter={() => setHoveredConnection(conn.label || connKey)}
                  onMouseLeave={() => setHoveredConnection(null)}
                />
                <path
                  d={d}
                  fill="none"
                  stroke={conn.active ? '#10B981' : '#CBD5E1'}
                  strokeWidth={conn.active ? 1.5 : 1}
                  strokeDasharray={conn.active ? '6 3' : '4 4'}
                  strokeDashoffset={conn.active ? -(animTick * 3) : 0}
                  opacity={conn.active ? 0.7 : 0.3}
                  markerEnd={conn.active ? 'url(#arrow-active)' : 'url(#arrow)'}
                  style={{ pointerEvents: 'none' }}
                />
              </g>
            )
          })}

          {/* Nodes */}
          {renderableNodes.map(node => {
            const pos = POSITIONS[node.id]
            if (!pos) return null
            const c = STATUS_COLORS[node.status] ?? STATUS_COLORS.unknown
            const Icon = TYPE_ICONS[node.type] ?? Activity
            const isSelected = selected?.id === node.id
            const typeColor = TYPE_COLORS[node.type]

            return (
              <g
                key={node.id}
                transform={`translate(${pos.x}, ${pos.y})`}
                onClick={() => setSelected(isSelected ? null : node)}
                style={{ cursor: 'pointer' }}
              >
                {/* Node box */}
                <rect
                  x={0} y={0} width={120} height={48}
                  rx={8}
                  fill="white"
                  stroke={isSelected ? '#7C3AED' : c.dot}
                  strokeWidth={isSelected ? 2 : 1}
                  filter="drop-shadow(0 1px 3px rgba(0,0,0,0.08))"
                />
                {/* Status bar */}
                <rect x={0} y={0} width={4} height={48} rx={8} fill={c.dot} />
                <rect x={0} y={4} width={4} height={40} fill={c.dot} />

                {/* Icon */}
                <foreignObject x={8} y={14} width={20} height={20}>
                  <Icon className="w-4 h-4 text-gray-500" />
                </foreignObject>

                {/* Domain label */}
                <text x={34} y={14} fontSize={8} fill={typeColor} fontFamily="system-ui" fontWeight={600}>
                  {node.businessContext?.domain
                    ? node.businessContext.domain.length > 16
                      ? node.businessContext.domain.slice(0, 14) + '…'
                      : node.businessContext.domain
                    : node.type.toUpperCase()}
                </text>

                {/* Node label */}
                <text x={34} y={25} fontSize={9} fill="#1C1C1E" fontWeight={600} fontFamily="system-ui">
                  {node.label.length > 14 ? node.label.slice(0, 12) + '…' : node.label}
                </text>

                {/* Owner/region */}
                <text x={34} y={35} fontSize={7} fill="#8E8E93" fontFamily="monospace">
                  {node.businessContext?.ownerTeam
                    ? node.businessContext.ownerTeam.length > 16
                      ? node.businessContext.ownerTeam.slice(0, 14) + '…'
                      : node.businessContext.ownerTeam
                    : node.region || node.type}
                </text>

                {/* Status dot */}
                <circle cx={110} cy={10} r={4} fill={c.dot}>
                  {node.status === 'healthy' && (
                    <animate attributeName="opacity" values="1;0.4;1" dur="2s" repeatCount="indefinite" />
                  )}
                </circle>

                {/* Latency badge */}
                {node.latencyMs !== undefined && (
                  <text x={34} y={44} fontSize={7} fill="#6B7280" fontFamily="monospace">
                    {node.latencyMs}ms
                  </text>
                )}
              </g>
            )
          })}
        </svg>

        {/* Connection hover tooltip */}
        {hoveredConnection && (
          <div style={{
            position: 'absolute',
            left: mousePos.x + 10,
            top: mousePos.y - 30,
            background: '#1C1C1E',
            color: 'white',
            padding: '6px 10px',
            borderRadius: 8,
            fontSize: 11,
            pointerEvents: 'none',
            zIndex: 100,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            maxWidth: 240,
          }}>
            <div style={{ fontWeight: 600, marginBottom: 2 }}>{hoveredConnection}</div>
            <div style={{ color: '#34C759' }}>● Active</div>
          </div>
        )}

        {/* Detail panel */}
        {selected && (
          <div className="absolute top-4 right-4 w-80 bg-white border border-gray-200 rounded-xl shadow-lg overflow-auto" style={{ maxHeight: 'calc(100% - 32px)' }}>
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <StatusDot status={selected.status} pulse />
                <span className="font-semibold text-gray-900 text-sm">{selected.label}</span>
              </div>
              <button onClick={() => setSelected(null)} className="p-1 rounded hover:bg-gray-100 transition-colors">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Business explain panel */}
              {selected.businessContext && (
                <>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8E8E93', marginBottom: 4 }}>
                      {selected.businessContext.domain}
                    </div>
                    <div style={{ fontSize: 13, color: '#1C1C1E', lineHeight: 1.5 }}>
                      {selected.businessContext.whatIsThis}
                    </div>
                  </div>

                  <div style={{ padding: '10px 12px', background: '#FF3B3008', borderRadius: 10, border: '1px solid #FF3B3020' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#FF3B30', marginBottom: 3 }}>WHY IT EXISTS</div>
                    <div style={{ fontSize: 12, color: '#1C1C1E' }}>{selected.businessContext.whyItExists}</div>
                  </div>

                  {selected.businessContext.dependedOnBy.length > 0 && (
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#8E8E93', marginBottom: 6 }}>WHAT DEPENDS ON THIS</div>
                      {selected.businessContext.dependedOnBy.map(nodeId => {
                        const dep = nodeMap.get(nodeId)
                        return dep ? (
                          <button key={nodeId} onClick={() => setSelected(dep)}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0', background: 'none', border: 'none', cursor: 'pointer', width: '100%' }}>
                            <StatusDot status={dep.status} />
                            <span style={{ fontSize: 12, color: '#007AFF' }}>{dep.label}</span>
                          </button>
                        ) : null
                      })}
                    </div>
                  )}

                  <div style={{ fontSize: 11, color: '#8E8E93', paddingTop: 4, borderTop: '1px solid rgba(0,0,0,0.08)' }}>
                    Owner: <strong style={{ color: '#1C1C1E' }}>{selected.businessContext.ownerTeam}</strong>
                    {' · '}Capability: <strong style={{ color: '#1C1C1E' }}>{selected.businessContext.capability}</strong>
                  </div>
                </>
              )}

              {/* Technical details */}
              <div className="border-t border-gray-100 pt-3 space-y-2">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide block">Technical</span>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Status</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[selected.status].bg} ${STATUS_COLORS[selected.status].text}`}>
                    {selected.status.toUpperCase()}
                  </span>
                </div>

                {selected.region && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Region</span>
                    <span className="text-xs font-mono text-gray-700">{selected.region}</span>
                  </div>
                )}

                {selected.latencyMs !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Latency</span>
                    <span className="text-xs font-mono text-gray-700">{selected.latencyMs}ms</span>
                  </div>
                )}

                {selected.uptimePct !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Uptime 30d</span>
                    <span className="text-xs font-mono text-emerald-700">{selected.uptimePct}%</span>
                  </div>
                )}

                {/* Connects to */}
                {selected.connects.length > 0 && (
                  <div>
                    <span className="text-xs text-gray-500 block mb-1">Connects to</span>
                    <div className="flex flex-wrap gap-1">
                      {selected.connects.map(id => {
                        const target = nodeMap.get(id)
                        return target ? (
                          <button
                            key={id}
                            onClick={() => setSelected(target)}
                            className="flex items-center gap-1 text-xs px-2 py-0.5 bg-gray-50 border border-gray-200 rounded-full hover:border-purple-400 transition-colors"
                          >
                            <StatusDot status={target.status} />
                            {target.label}
                            <ChevronRight className="w-3 h-3 text-gray-400" />
                          </button>
                        ) : null
                      })}
                    </div>
                  </div>
                )}

                {/* Details */}
                {selected.details && (
                  <div className="border-t border-gray-100 pt-2">
                    <div className="space-y-1">
                      {Object.entries(selected.details).map(([k, v]) => (
                        <div key={k} className="flex justify-between">
                          <span className="text-xs text-gray-500">{k}</span>
                          <span className="text-xs font-mono text-gray-700">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
