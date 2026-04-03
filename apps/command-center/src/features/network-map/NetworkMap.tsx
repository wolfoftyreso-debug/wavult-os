// ─── Wavult Network Map — Full System Topology ───────────────────────────────
// Reaktivt tema · Inga legacy-domäner · Live ping

import React, { useState, useEffect, useCallback } from 'react'
import { Globe, Server, Cloud, Zap, ExternalLink, RefreshCw, Shield, Terminal } from 'lucide-react'

type NodeKind    = 'site' | 'api' | 'cdn' | 'tunnel' | 'service'
type NodeStatus  = 'up' | 'down' | 'unknown'
type ZoneGroup   = 'wavult.com' | 'quixzoom.com' | 'landvex.com' | 'dissg' | 'apifly' | 'other' | 'aws' | 'internal'

interface NetNode {
  id: string
  hostname: string
  label: string
  kind: NodeKind
  zone: ZoneGroup
  target: string
  provider: string
  status: NodeStatus
  latency?: number
  description: string
  url?: string
  critical: boolean
}

// ─── Registry — LÅST 2026-04-03 — alla Wavult-domäner + AWS-tjänster ─────────
// Källa: Cloudflare (29 zoner) + Route53 (9 domäner) + Namecheap (8 domäner)
// certified.com BORTTAGEN 2026-04-03 — ägs ej av Wavult
// Ändra inte utan Eriks godkännande

const ALL_NODES: NetNode[] = [
  // ── wavult.com ────────────────────────────────────────────────────────────
  { id: 'wavult-root',  hostname: 'wavult.com',            label: 'Wavult Group',       kind: 'site',    zone: 'wavult.com',   target: 'wavult-group.pages.dev',            provider: 'CF Pages',   status: 'unknown', description: 'Wavult Group — corporate website', url: 'https://wavult.com', critical: false },
  { id: 'wavult-os',    hostname: 'os.wavult.com',         label: 'Wavult OS',          kind: 'site',    zone: 'wavult.com',   target: 'wavult-os.pages.dev',               provider: 'CF Pages',   status: 'unknown', description: 'Wavult OS — enterprise operativsystem', url: 'https://os.wavult.com', critical: true },
  { id: 'wavult-api',   hostname: 'api.wavult.com',        label: 'API',                kind: 'api',     zone: 'wavult.com',   target: 'wavult-api-alb → ECS eu-north-1',   provider: 'AWS ALB',    status: 'unknown', description: 'Wavult OS API — main backend, port 3001', url: 'https://api.wavult.com/health', critical: true },
  { id: 'wavult-n8n',   hostname: 'n8n.wavult.com',        label: 'n8n',                kind: 'service', zone: 'wavult.com',   target: 'wavult-api-alb /n8n/*',             provider: 'AWS ECS',    status: 'unknown', description: 'n8n automationsmotor', url: 'https://n8n.wavult.com', critical: false },
  { id: 'wavult-git',   hostname: 'git.wavult.com',        label: 'Gitea',              kind: 'service', zone: 'wavult.com',   target: 'wavult-api-alb → gitea ECS',        provider: 'AWS ECS',    status: 'unknown', description: 'Self-hosted Git — intern kodbas', url: 'https://git.wavult.com', critical: true },
  { id: 'wavult-bernt', hostname: 'bernt.wavult.com',      label: 'Bernt (AI)',         kind: 'tunnel',  zone: 'wavult.com',   target: 'cfargotunnel → OpenClaw WSL2',      provider: 'CF Tunnel',  status: 'unknown', description: 'Bernt AI — Cloudflare Tunnel till lokal OpenClaw', url: 'https://bernt.wavult.com', critical: true },

  // ── quixzoom.com + quixom.com ─────────────────────────────────────────────
  { id: 'qx-root',      hostname: 'quixzoom.com',          label: 'quiXzoom',           kind: 'site',    zone: 'quixzoom.com', target: 'd3nf5qp2za1hod.cloudfront.net',     provider: 'CloudFront', status: 'unknown', description: 'quiXzoom landing page', url: 'https://quixzoom.com', critical: true },
  { id: 'qx-app',       hostname: 'app.quixzoom.com',      label: 'quiXzoom App',       kind: 'site',    zone: 'quixzoom.com', target: 'dewrtqzc20flx.cloudfront.net',      provider: 'CloudFront', status: 'unknown', description: 'quiXzoom webapp — missions, zoomers', url: 'https://app.quixzoom.com', critical: true },
  { id: 'qx-api',       hostname: 'api.quixzoom.com',      label: 'quiXzoom API',       kind: 'api',     zone: 'quixzoom.com', target: 'wavult-api-alb → quixzoom-api ECS', provider: 'AWS ALB',    status: 'unknown', description: 'quiXzoom API — uppdrag, zoomers, betalningar', url: 'https://api.quixzoom.com/health', critical: true },
  { id: 'qx-quixom',    hostname: 'quixom.com',            label: 'Quixom Ads',         kind: 'site',    zone: 'quixzoom.com', target: 'CF Zone — ej live ännu',            provider: 'CF Pages',   status: 'unknown', description: 'Quixom Ads — B2B dataplattform (fas 2)', url: 'https://quixom.com', critical: false },
  // quiXzoom EU (Route53)
  { id: 'qx-de',        hostname: 'quixzoom.de',           label: 'quiXzoom Deutschland', kind: 'site',  zone: 'quixzoom.com', target: 'Route53 → CF migration pending',    provider: 'Route53',    status: 'unknown', description: 'quiXzoom Deutschland — EU-marknad, Route53, väntar CF-migration', url: 'https://quixzoom.de', critical: false },
  { id: 'qx-fr',        hostname: 'quixzoom.fr',           label: 'quiXzoom France',    kind: 'site',    zone: 'quixzoom.com', target: 'Route53 → CF migration pending',    provider: 'Route53',    status: 'unknown', description: 'quiXzoom France — EU-marknad, Route53, väntar CF-migration', url: 'https://quixzoom.fr', critical: false },
  { id: 'qx-nl',        hostname: 'quixzoom.nl',           label: 'quiXzoom Nederland', kind: 'site',    zone: 'quixzoom.com', target: 'Route53 → CF migration pending',    provider: 'Route53',    status: 'unknown', description: 'quiXzoom Nederland — EU-marknad, Route53, väntar CF-migration', url: 'https://quixzoom.nl', critical: false },
  { id: 'qx-ch',        hostname: 'quixzoom.ch',           label: 'quiXzoom Schweiz',   kind: 'site',    zone: 'quixzoom.com', target: 'Route53 → CF migration pending',    provider: 'Route53',    status: 'unknown', description: 'quiXzoom Schweiz — EU-marknad, Route53, väntar CF-migration', url: 'https://quixzoom.ch', critical: false },
  { id: 'qx-be',        hostname: 'quixzoom.be',           label: 'quiXzoom België',    kind: 'site',    zone: 'quixzoom.com', target: 'Route53 → CF migration pending',    provider: 'Route53',    status: 'unknown', description: 'quiXzoom België — EU-marknad, Route53, väntar CF-migration', url: 'https://quixzoom.be', critical: false },
  // quiXzoom Global (Namecheap)
  { id: 'qx-co',        hostname: 'quixzoom.co',           label: 'quiXzoom CO',        kind: 'site',    zone: 'quixzoom.com', target: 'Namecheap → DNS ej konfigurerad',   provider: 'Namecheap',  status: 'unknown', description: 'quiXzoom CO — global marknad, Namecheap, DNS ej konfigurerad', url: 'https://quixzoom.co', critical: false },
  { id: 'qx-couk',      hostname: 'quixzoom.co.uk',        label: 'quiXzoom UK',        kind: 'site',    zone: 'quixzoom.com', target: 'Namecheap → DNS ej konfigurerad',   provider: 'Namecheap',  status: 'unknown', description: 'quiXzoom UK — brittisk marknad, Namecheap, DNS ej konfigurerad', url: 'https://quixzoom.co.uk', critical: false },
  { id: 'qx-mx',        hostname: 'quixzoom.mx',           label: 'quiXzoom Mexico',    kind: 'site',    zone: 'quixzoom.com', target: 'Namecheap → DNS ej konfigurerad',   provider: 'Namecheap',  status: 'unknown', description: 'quiXzoom Mexico — mexikansk marknad, Namecheap, DNS ej konfigurerad', url: 'https://quixzoom.mx', critical: false },

  // ── landvex.com + landvex.se ──────────────────────────────────────────────
  { id: 'lv-com',       hostname: 'landvex.com',           label: 'LandveX Global',     kind: 'site',    zone: 'landvex.com',  target: 'landvex-prod S3 + CloudFront',      provider: 'CloudFront', status: 'unknown', description: 'LandveX — enterprise infrastrukturintelligens, global', url: 'https://landvex.com', critical: false },
  { id: 'lv-se',        hostname: 'landvex.se',            label: 'LandveX Sverige',    kind: 'site',    zone: 'landvex.com',  target: 'CF Zone — NS ej propagerat',        provider: 'CF Pages',   status: 'unknown', description: 'LandveX Sverige — lansering juni 2026', url: 'https://landvex.se', critical: false },
  { id: 'lv-api',       hostname: 'api.wavult.com/v1',     label: 'LandveX API',        kind: 'api',     zone: 'landvex.com',  target: 'wavult-api-alb → landvex-api ECS', provider: 'AWS ECS',    status: 'unknown', description: 'LandveX B2G API — /v1/objects, /v1/alerts', url: 'https://api.wavult.com/health', critical: false },
  // LandveX EU (Route53)
  { id: 'lv-de',        hostname: 'landvex.de',            label: 'LandveX Deutschland', kind: 'site',   zone: 'landvex.com',  target: 'Route53 → CF migration pending',    provider: 'Route53',    status: 'unknown', description: 'LandveX Deutschland — EU-marknad, Route53 hosted zone, väntar CF-migration', url: 'https://landvex.de', critical: false },
  { id: 'lv-fr',        hostname: 'landvex.fr',            label: 'LandveX France',     kind: 'site',    zone: 'landvex.com',  target: 'Route53 → CF migration pending',    provider: 'Route53',    status: 'unknown', description: 'LandveX France — EU-marknad, Route53 hosted zone, väntar CF-migration', url: 'https://landvex.fr', critical: false },
  { id: 'lv-nl',        hostname: 'landvex.nl',            label: 'LandveX Nederland',  kind: 'site',    zone: 'landvex.com',  target: 'Route53 → CF migration pending',    provider: 'Route53',    status: 'unknown', description: 'LandveX Nederland — EU-marknad, Route53 hosted zone, väntar CF-migration', url: 'https://landvex.nl', critical: false },
  { id: 'lv-ch',        hostname: 'landvex.ch',            label: 'LandveX Schweiz',    kind: 'site',    zone: 'landvex.com',  target: 'Route53 → CF migration pending',    provider: 'Route53',    status: 'unknown', description: 'LandveX Schweiz — EU-marknad, Route53 hosted zone, väntar CF-migration', url: 'https://landvex.ch', critical: false },
  // LandveX Global (Namecheap)
  { id: 'lv-co',        hostname: 'landvex.co',            label: 'LandveX CO',         kind: 'site',    zone: 'landvex.com',  target: 'Namecheap → DNS ej konfigurerad',   provider: 'Namecheap',  status: 'unknown', description: 'LandveX CO — global marknad, Namecheap, DNS ej konfigurerad', url: 'https://landvex.co', critical: false },
  { id: 'lv-couk',      hostname: 'landvex.co.uk',         label: 'LandveX UK',         kind: 'site',    zone: 'landvex.com',  target: 'Namecheap → DNS ej konfigurerad',   provider: 'Namecheap',  status: 'unknown', description: 'LandveX UK — brittisk marknad, Namecheap, DNS ej konfigurerad', url: 'https://landvex.co.uk', critical: false },
  { id: 'lv-in',        hostname: 'landvex.in',            label: 'LandveX India',      kind: 'site',    zone: 'landvex.com',  target: 'Namecheap → DNS ej konfigurerad',   provider: 'Namecheap',  status: 'unknown', description: 'LandveX India — indisk marknad, Namecheap, DNS ej konfigurerad', url: 'https://landvex.in', critical: false },
  { id: 'lv-mx',        hostname: 'landvex.mx',            label: 'LandveX Mexico',     kind: 'site',    zone: 'landvex.com',  target: 'Namecheap → DNS ej konfigurerad',   provider: 'Namecheap',  status: 'unknown', description: 'LandveX Mexico — mexikansk marknad, Namecheap, DNS ej konfigurerad', url: 'https://landvex.mx', critical: false },

  // ── DISSG (7 domäner) ─────────────────────────────────────────────────────
  { id: 'dissg-com',    hostname: 'dissg.com',             label: 'DISSG',              kind: 'site',    zone: 'dissg',        target: 'CF Zone — NS pending',              provider: 'CF Pages',   status: 'unknown', description: 'DISSG — distributed intelligence platform', url: 'https://dissg.com', critical: false },
  { id: 'dissg-app',    hostname: 'dissg.app',             label: 'DISSG App',          kind: 'site',    zone: 'dissg',        target: 'CF Zone — NS pending',              provider: 'CF Pages',   status: 'unknown', description: 'DISSG webapp', url: 'https://dissg.app', critical: false },
  { id: 'dissg-io',     hostname: 'dissg.io',              label: 'DISSG IO',           kind: 'site',    zone: 'dissg',        target: 'CF Zone — NS pending',              provider: 'CF Pages',   status: 'unknown', description: 'DISSG IO', url: 'https://dissg.io', critical: false },
  { id: 'dissg-net',    hostname: 'dissg.network',         label: 'DISSG Network',      kind: 'site',    zone: 'dissg',        target: 'CF Zone — NS pending',              provider: 'CF Pages',   status: 'unknown', description: 'DISSG Network', url: 'https://dissg.network', critical: false },
  { id: 'dissg-sys',    hostname: 'dissg.systems',         label: 'DISSG Systems',      kind: 'site',    zone: 'dissg',        target: 'CF Zone — NS pending',              provider: 'CF Pages',   status: 'unknown', description: 'DISSG Systems', url: 'https://dissg.systems', critical: false },
  { id: 'dissg-dig',    hostname: 'dissg.digital',         label: 'DISSG Digital',      kind: 'site',    zone: 'dissg',        target: 'CF Zone — NS pending',              provider: 'CF Pages',   status: 'unknown', description: 'DISSG Digital', url: 'https://dissg.digital', critical: false },
  { id: 'dissg-world',  hostname: 'dissg.world',           label: 'DISSG World',        kind: 'site',    zone: 'dissg',        target: 'CF Zone — NS pending',              provider: 'CF Pages',   status: 'unknown', description: 'DISSG World', url: 'https://dissg.world', critical: false },

  // ── Apifly + APBXP (8 domäner) ───────────────────────────────────────────
  { id: 'apifly',       hostname: 'apifly.com',            label: 'Apifly',             kind: 'site',    zone: 'apifly',       target: 'CF Zone — NS pending',              provider: 'CF Pages',   status: 'unknown', description: 'Apifly — API marketplace', url: 'https://apifly.com', critical: false },
  { id: 'apbxp-cloud',  hostname: 'apbxp.cloud',           label: 'APBXP Cloud',        kind: 'site',    zone: 'apifly',       target: 'CF Zone — active',                  provider: 'CF Pages',   status: 'unknown', description: 'APBXP Cloud', url: 'https://apbxp.cloud', critical: false },
  { id: 'apbxp-com',    hostname: 'apbxp.com',             label: 'APBXP',              kind: 'site',    zone: 'apifly',       target: 'CF Zone — NS pending',              provider: 'CF Pages',   status: 'unknown', description: 'APBXP', url: 'https://apbxp.com', critical: false },
  { id: 'apbxp-io',     hostname: 'apbxp.io',              label: 'APBXP IO',           kind: 'site',    zone: 'apifly',       target: 'CF Zone — active',                  provider: 'CF Pages',   status: 'unknown', description: 'APBXP IO', url: 'https://apbxp.io', critical: false },
  { id: 'apbxp-dev',    hostname: 'apbxp.dev',             label: 'APBXP Dev',          kind: 'site',    zone: 'apifly',       target: 'CF Zone — NS pending',              provider: 'CF Pages',   status: 'unknown', description: 'APBXP Dev', url: 'https://apbxp.dev', critical: false },
  { id: 'apbxp-org',    hostname: 'apbxp.org',             label: 'APBXP Org',          kind: 'site',    zone: 'apifly',       target: 'CF Zone — active',                  provider: 'CF Pages',   status: 'unknown', description: 'APBXP Org', url: 'https://apbxp.org', critical: false },
  { id: 'apbxp-online', hostname: 'apbxp.online',          label: 'APBXP Online',       kind: 'site',    zone: 'apifly',       target: 'CF Zone — active',                  provider: 'CF Pages',   status: 'unknown', description: 'APBXP Online', url: 'https://apbxp.online', critical: false },
  { id: 'apbxp-tech',   hostname: 'apbxp.tech',            label: 'APBXP Tech',         kind: 'site',    zone: 'apifly',       target: 'CF Zone — active',                  provider: 'CF Pages',   status: 'unknown', description: 'APBXP Tech', url: 'https://apbxp.tech', critical: false },

  // ── Övriga varumärken ─────────────────────────────────────────────────────
  { id: 'uapix',        hostname: 'uapix.com',             label: 'UAPIX',              kind: 'site',    zone: 'other',        target: 'CF Zone — NS pending',              provider: 'CF Pages',   status: 'unknown', description: 'UAPIX — UAP observationsplattform', url: 'https://uapix.com', critical: false },
  { id: 'mlcs',         hostname: 'mlcs.com',              label: 'MLCS',               kind: 'site',    zone: 'other',        target: 'CF Zone — NS pending',              provider: 'CF Pages',   status: 'unknown', description: 'MLCS Protocol — klinisk kunskapsplattform', url: 'https://mlcs.com', critical: false },
  { id: 'opticins',     hostname: 'opticinsights.com',     label: 'Optic Insights',     kind: 'site',    zone: 'other',        target: 'CF Zone — NS pending',              provider: 'CF Pages',   status: 'unknown', description: 'Optic Insights — vision engine portal', url: 'https://opticinsights.com', critical: false },
  { id: 'corpfitt',     hostname: 'corpfitt.com',          label: 'CorpFitt',           kind: 'site',    zone: 'other',        target: 'CF Zone — NS pending',              provider: 'CF Pages',   status: 'unknown', description: 'CorpFitt — global fitness access', url: 'https://corpfitt.com', critical: false },
  { id: 'strim',        hostname: 'strim.se',              label: 'STRIM',              kind: 'site',    zone: 'other',        target: 'CF Zone — NS pending',              provider: 'CF Pages',   status: 'unknown', description: 'STRIM.se', url: 'https://strim.se', critical: false },
  { id: 'clearneural',  hostname: 'clearneural.com',       label: 'ClearNeural',        kind: 'site',    zone: 'other',        target: 'CF Zone — NS pending',              provider: 'CF Pages',   status: 'unknown', description: 'ClearNeural', url: 'https://clearneural.com', critical: false },
  { id: 'supportfounds',hostname: 'supportfounds.com',     label: 'SupportFounds',      kind: 'site',    zone: 'other',        target: 'CF Zone — NS pending',              provider: 'CF Pages',   status: 'unknown', description: 'SupportFounds — venture engine', url: 'https://supportfounds.com', critical: false },

  // ── AWS Services ──────────────────────────────────────────────────────────
  { id: 'ecs-os',       hostname: 'wavult-os-api',         label: 'Wavult OS API',      kind: 'service', zone: 'aws',          target: 'ECS wavult cluster eu-north-1',     provider: 'AWS ECS',    status: 'unknown', description: 'Node.js API — Wavult OS backend, port 3001', critical: true },
  { id: 'ecs-qx',       hostname: 'quixzoom-api',          label: 'quiXzoom API',       kind: 'service', zone: 'aws',          target: 'ECS wavult cluster eu-north-1',     provider: 'AWS ECS',    status: 'unknown', description: 'quiXzoom API — Supabase-backed', critical: true },
  { id: 'ecs-core',     hostname: 'wavult-core',           label: 'Wavult Core',        kind: 'service', zone: 'aws',          target: 'ECS wavult cluster eu-north-1',     provider: 'AWS ECS',    status: 'unknown', description: 'AI-gateway — OpenAI, Anthropic, ElevenLabs, 46elks proxy', critical: true },
  { id: 'ecs-id',       hostname: 'identity-core',         label: 'Identity Core',      kind: 'service', zone: 'aws',          target: 'ECS wavult cluster eu-north-1',     provider: 'AWS ECS',    status: 'unknown', description: 'Suverän auth — Argon2id, JWT/KMS, PII-isolering', critical: true },
  { id: 'ecs-kafka',    hostname: 'wavult-kafka',          label: 'Kafka',              kind: 'service', zone: 'aws',          target: 'ECS wavult cluster eu-north-1',     provider: 'AWS ECS',    status: 'unknown', description: 'Händelseström — 16 topics, wavult.* schema', critical: true },
  { id: 'ecs-redis',    hostname: 'wavult-redis',          label: 'Redis',              kind: 'service', zone: 'aws',          target: 'ECS wavult cluster eu-north-1',     provider: 'AWS ECS',    status: 'unknown', description: 'In-memory cache — sessions, rate limiting, pub/sub', critical: true },
  { id: 'ecs-supabase', hostname: 'supabase',              label: 'Supabase',           kind: 'service', zone: 'aws',          target: 'ECS wavult cluster eu-north-1',     provider: 'AWS ECS',    status: 'unknown', description: 'Self-hosted Supabase — PostgreSQL + auth + realtime', critical: true },
  { id: 'ecs-landvex',  hostname: 'landvex-api',           label: 'LandveX API',        kind: 'service', zone: 'aws',          target: 'ECS wavult cluster eu-north-1',     provider: 'AWS ECS',    status: 'unknown', description: 'LandveX API — B2G alerts, objektregister', critical: false },
  { id: 'ecs-n8n',      hostname: 'n8n',                   label: 'n8n',                kind: 'service', zone: 'aws',          target: 'ECS wavult cluster eu-north-1',     provider: 'AWS ECS',    status: 'unknown', description: 'Automationsmotor — Morning Brief, BOS webhooks', critical: false },
  { id: 'ecs-gitea',    hostname: 'gitea',                 label: 'Gitea',              kind: 'service', zone: 'aws',          target: 'ECS wavult cluster eu-north-1',     provider: 'AWS ECS',    status: 'unknown', description: 'Self-hosted Git — alla Wavult-repos', critical: true },
  { id: 'ecs-sched',    hostname: 'bos-scheduler',         label: 'BOS Scheduler',      kind: 'service', zone: 'aws',          target: 'ECS wavult cluster eu-north-1',     provider: 'AWS ECS',    status: 'unknown', description: 'Schemaläggare — tidsstyrda jobb, eskaleringar', critical: false },

  // ── Internal ──────────────────────────────────────────────────────────────
  { id: 'openclaw',     hostname: 'openclaw-local',        label: 'OpenClaw (Bernt)',   kind: 'service', zone: 'internal',     target: 'WSL2 · localhost:18789',            provider: 'OpenClaw',   status: 'unknown', description: 'OpenClaw runtime — Bernt AI, Telegram, cron, memory', critical: true },
  { id: 'cf-tunnel',    hostname: 'CF Tunnel',             label: 'Cloudflare Tunnel',  kind: 'tunnel',  zone: 'internal',     target: 'bernt.wavult.com → OpenClaw',       provider: 'CF Tunnel',  status: 'unknown', description: 'Persistent CF tunnel — exponerar Bernt externt', critical: true },
]

// ─── Zone config ──────────────────────────────────────────────────────────────

const ZONE_CONFIG: Record<ZoneGroup, { color: string; label: string; icon: React.ElementType }> = {
  'wavult.com':   { color: '#2563EB', label: 'wavult.com',    icon: Globe },
  'quixzoom.com': { color: '#10B981', label: 'quixzoom.com',  icon: Globe },
  'landvex.com':  { color: '#4A7A5B', label: 'landvex',       icon: Globe },
  'dissg':        { color: '#7C3AED', label: 'dissg.*',        icon: Globe },
  'apifly':       { color: '#D97706', label: 'apifly/apbxp',  icon: Zap },
  'other':        { color: '#6B7280', label: 'Övriga',        icon: Globe },
  'aws':          { color: '#F97316', label: 'AWS',           icon: Server },
  'internal':     { color: '#0891B2', label: 'Internal',      icon: Terminal },
}

const KIND_ICON: Record<NodeKind, React.ElementType> = {
  site: Globe, api: Zap, cdn: Cloud, tunnel: Shield, service: Server,
}

// ─── Live status check ────────────────────────────────────────────────────────

async function checkUrl(url: string): Promise<{ status: NodeStatus; latency: number }> {
  const start = performance.now()
  try {
    await fetch(url, { method: 'HEAD', mode: 'no-cors', cache: 'no-store', signal: AbortSignal.timeout(6000) })
    return { status: 'up', latency: Math.round(performance.now() - start) }
  } catch {
    return { status: 'down', latency: Math.round(performance.now() - start) }
  }
}

// ─── Node Card ────────────────────────────────────────────────────────────────

function NodeCard({ node, selected, onClick }: { node: NetNode; selected: boolean; onClick: () => void }) {
  const zone = ZONE_CONFIG[node.zone]
  const Icon = KIND_ICON[node.kind]
  const statusColor = node.status === 'up' ? '#10B981' : node.status === 'down' ? '#EF4444' : 'rgba(10,61,98,.25)'

  return (
    <div
      onClick={onClick}
      style={{
        background: selected ? `${zone.color}08` : 'var(--color-surface, #FDFAF5)',
        border: `1px solid ${selected ? zone.color + '60' : 'var(--color-border, rgba(10,61,98,.1))'}`,
        borderLeft: `3px solid ${node.critical ? zone.color : 'var(--color-border, rgba(10,61,98,.1))'}`,
        borderRadius: 8,
        padding: '10px 12px',
        cursor: 'pointer',
        transition: 'all 0.12s',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = `0 2px 12px ${zone.color}18` }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = 'none' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
          <Icon size={11} color="var(--color-text-muted, rgba(10,61,98,.4))" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-primary, #0A3D62)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'ui-monospace, monospace' }}>
            {node.hostname}
          </span>
        </div>
        <div style={{ position: 'relative', width: 8, height: 8, flexShrink: 0, marginTop: 2 }}>
          {node.status === 'up' && (
            <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: statusColor, opacity: 0.35, animation: 'uap-ping 2s ease-in-out infinite' }} />
          )}
          <span style={{ position: 'absolute', inset: 1, borderRadius: '50%', background: statusColor }} />
        </div>
      </div>

      <div style={{ fontSize: 9, color: 'var(--color-text-muted, rgba(10,61,98,.4))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 8, fontFamily: 'ui-monospace, monospace' }}>
        → {node.target}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{
          padding: '2px 7px', borderRadius: 4,
          background: `${zone.color}12`, border: `1px solid ${zone.color}25`,
          fontSize: 8, fontWeight: 700, color: zone.color, letterSpacing: '0.06em',
        }}>
          {node.provider}
        </div>
        {node.latency !== undefined && (
          <span style={{ fontSize: 9, color: 'var(--color-text-muted, rgba(10,61,98,.4))', fontVariantNumeric: 'tabular-nums', fontFamily: 'ui-monospace' }}>
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
  const statusColor = node.status === 'up' ? '#10B981' : node.status === 'down' ? '#EF4444' : 'rgba(10,61,98,.25)'
  const statusLabel = node.status === 'up' ? 'ONLINE' : node.status === 'down' ? 'OFFLINE' : 'OKÄND'

  return (
    <div style={{
      width: 300, flexShrink: 0,
      borderLeft: '1px solid var(--color-border, rgba(10,61,98,.1))',
      background: 'var(--color-surface, #FDFAF5)',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--color-border, rgba(10,61,98,.1))', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-primary, #0A3D62)', marginBottom: 2, fontFamily: 'ui-monospace, monospace' }}>{node.hostname}</div>
          <div style={{ fontSize: 10, color: 'var(--color-text-muted, rgba(10,61,98,.4))' }}>{node.label}</div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted, rgba(10,61,98,.4))', fontSize: 16, lineHeight: 1, padding: 2 }}>✕</button>
      </div>

      {/* Badges */}
      <div style={{ padding: '10px 18px', borderBottom: '1px solid var(--color-border, rgba(10,61,98,.1))', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {[
          { label: statusLabel, color: statusColor },
          { label: zone.label.toUpperCase(), color: zone.color },
          ...(node.critical ? [{ label: 'CRITICAL', color: '#EF4444' }] : []),
        ].map(b => (
          <div key={b.label} style={{ padding: '3px 8px', borderRadius: 4, background: `${b.color}12`, border: `1px solid ${b.color}30`, fontSize: 9, fontWeight: 700, color: b.color, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: b.color, flexShrink: 0 }} />
            {b.label}
          </div>
        ))}
      </div>

      {/* Body */}
      <div style={{ padding: '14px 18px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <div style={{ fontSize: 8, color: 'var(--color-text-muted, rgba(10,61,98,.4))', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Beskrivning</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary, rgba(10,61,98,.7))', lineHeight: 1.7 }}>{node.description}</div>
        </div>

        <div>
          <div style={{ fontSize: 8, color: 'var(--color-text-muted, rgba(10,61,98,.4))', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Routing</div>
          <div style={{ fontSize: 10, color: 'var(--color-text-secondary, rgba(10,61,98,.7))', lineHeight: 1.6, padding: '8px 10px', background: 'rgba(10,61,98,.04)', borderRadius: 6, fontFamily: 'ui-monospace, monospace' }}>
            {node.hostname}<br />
            <span style={{ color: 'var(--color-text-muted, rgba(10,61,98,.4))' }}>→ {node.target}</span>
          </div>
        </div>

        {[
          { k: 'Provider', v: node.provider },
          { k: 'Kind', v: node.kind.toUpperCase() },
          { k: 'Zone', v: node.zone },
          { k: 'Latency', v: node.latency !== undefined ? `${node.latency} ms` : '—' },
        ].map(r => (
          <div key={r.k} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border, rgba(10,61,98,.08))', paddingBottom: 8, fontSize: 11 }}>
            <span style={{ color: 'var(--color-text-muted, rgba(10,61,98,.4))' }}>{r.k}</span>
            <span style={{ color: 'var(--color-text-primary, #0A3D62)', fontFamily: 'ui-monospace, monospace' }}>{r.v}</span>
          </div>
        ))}

        {node.url && (
          <a href={node.url} target="_blank" rel="noopener noreferrer" style={{
            display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center',
            padding: '8px', borderRadius: 6,
            border: '1px solid var(--color-border, rgba(10,61,98,.1))',
            color: 'var(--color-text-secondary, rgba(10,61,98,.6))',
            textDecoration: 'none', fontSize: 11,
            background: 'rgba(10,61,98,.03)',
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
  const upCount   = nodes.filter(n => n.status === 'up').length
  const downCount = nodes.filter(n => n.status === 'down').length

  const groups = (filter === 'all' ? zones : [filter as ZoneGroup])
    .map(zone => ({ zone, cfg: ZONE_CONFIG[zone], nodes: filtered.filter(n => n.zone === zone) }))
    .filter(g => g.nodes.length > 0)

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--color-bg, #F5F0E8)' }}>

      {/* ── Top bar ── */}
      <div style={{
        flexShrink: 0, padding: '12px 20px',
        borderBottom: '1px solid var(--color-border, rgba(10,61,98,.1))',
        background: 'var(--color-surface, #FDFAF5)',
        display: 'flex', alignItems: 'center', gap: 0, flexWrap: 'wrap', rowGap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingRight: 20, borderRight: '1px solid var(--color-border, rgba(10,61,98,.1))' }}>
          <Globe size={13} color="var(--color-text-secondary, rgba(10,61,98,.6))" />
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-primary, #0A3D62)', letterSpacing: '0.06em', fontFamily: 'ui-monospace, monospace' }}>
            NETWORK MAP
          </span>
        </div>

        {[
          { label: 'ENDPOINTS', value: String(nodes.filter(n => n.url).length) },
          { label: 'ONLINE',    value: String(upCount),   color: upCount > 0   ? '#10B981' : undefined },
          { label: 'OFFLINE',   value: String(downCount), color: downCount > 0 ? '#EF4444' : undefined },
          { label: 'TOTAL',     value: String(nodes.length) },
        ].map(s => (
          <div key={s.label} style={{ paddingLeft: 20, paddingRight: 20, borderRight: '1px solid var(--color-border, rgba(10,61,98,.1))' }}>
            <div style={{ fontSize: 7, color: 'var(--color-text-muted, rgba(10,61,98,.35))', letterSpacing: '0.1em', marginBottom: 2, fontFamily: 'ui-monospace' }}>{s.label}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: s.color ?? 'var(--color-text-primary, #0A3D62)', fontVariantNumeric: 'tabular-nums' }}>{s.value}</div>
          </div>
        ))}

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          {lastChecked && (
            <span style={{ fontSize: 9, color: 'var(--color-text-muted, rgba(10,61,98,.35))', fontFamily: 'ui-monospace' }}>
              checked {lastChecked.toLocaleTimeString('sv-SE')}
            </span>
          )}
          <button onClick={runChecks} disabled={checking} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '6px 12px', borderRadius: 6,
            border: '1px solid var(--color-border, rgba(10,61,98,.15))',
            background: 'var(--color-bg, #F5F0E8)',
            color: 'var(--color-text-secondary, rgba(10,61,98,.6))',
            fontSize: 10, fontWeight: 700, cursor: checking ? 'not-allowed' : 'pointer',
            letterSpacing: '0.04em', opacity: checking ? 0.5 : 1,
            fontFamily: 'ui-monospace, monospace',
          }}>
            <RefreshCw size={11} style={{ animation: checking ? 'nm-spin 1s linear infinite' : 'none' }} />
            {checking ? 'CHECKING...' : 'REFRESH'}
          </button>
        </div>
      </div>

      {/* ── Zone filter ── */}
      <div style={{
        flexShrink: 0, padding: '8px 20px',
        borderBottom: '1px solid var(--color-border, rgba(10,61,98,.1))',
        display: 'flex', gap: 4, background: 'var(--color-surface, #FDFAF5)', flexWrap: 'wrap',
      }}>
        {(['all', ...zones] as FilterZone[]).map(z => {
          const cfg = z === 'all' ? null : ZONE_CONFIG[z]
          const active = filter === z
          const color = cfg?.color ?? '#0A3D62'
          return (
            <button key={z} onClick={() => setFilter(z)} style={{
              padding: '4px 12px', borderRadius: 5, cursor: 'pointer',
              fontSize: 9, fontWeight: 700, letterSpacing: '0.06em',
              background: active ? `${color}15` : 'transparent',
              color: active ? color : 'var(--color-text-muted, rgba(10,61,98,.4))',
              border: active ? `1px solid ${color}35` : '1px solid transparent',
              transition: 'all 0.12s',
              fontFamily: 'ui-monospace, monospace',
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
            const up      = zNodes.filter(n => n.status === 'up').length
            const down    = zNodes.filter(n => n.status === 'down').length
            const pending = zNodes.filter(n => n.provider === 'Route53' || n.provider === 'Namecheap').length
            return (
              <div key={zone} style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <ZoneIcon size={12} color={cfg.color} />
                  <span style={{ fontSize: 9, fontWeight: 800, color: cfg.color, letterSpacing: '0.12em', fontFamily: 'ui-monospace, monospace' }}>
                    {cfg.label.toUpperCase()}
                  </span>
                  {pending > 0 && (
                    <div style={{ padding: '2px 7px', borderRadius: 4, background: '#F975161A', border: '1px solid #F9751635', fontSize: 8, fontWeight: 700, color: '#F97316', letterSpacing: '0.06em', fontFamily: 'ui-monospace, monospace' }}>
                      {pending} PENDING MIGRATION
                    </div>
                  )}
                  <div style={{ flex: 1, height: 1, background: 'var(--color-border, rgba(10,61,98,.1))' }} />
                  <span style={{ fontSize: 9, fontFamily: 'ui-monospace, monospace' }}>
                    {up > 0   && <span style={{ color: '#10B981' }}>{up} up</span>}
                    {down > 0 && <span style={{ color: '#EF4444' }}>{up > 0 ? ' · ' : ''}{down} down</span>}
                    <span style={{ color: 'var(--color-text-muted, rgba(10,61,98,.35))' }}> / {zNodes.length}</span>
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8 }}>
                  {zNodes.map(n => (
                    <NodeCard key={n.id} node={n} selected={selected === n.id}
                      onClick={() => setSelected(s => s === n.id ? null : n.id)} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {selectedNode && <DetailPanel node={selectedNode} onClose={() => setSelected(null)} />}
      </div>

      <style>{`
        @keyframes uap-ping { 0%,100% { transform:scale(1); opacity:.35 } 50% { transform:scale(2.8); opacity:0 } }
        @keyframes nm-spin  { from { transform:rotate(0deg) } to { transform:rotate(360deg) } }
      `}</style>
    </div>
  )
}
