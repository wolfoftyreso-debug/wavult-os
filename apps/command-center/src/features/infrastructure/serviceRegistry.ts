/**
 * SERVICE REGISTRY — Internal Use Only
 *
 * Detta register är tillgängligt för autentiserade användare i Wavult OS.
 * Systemet är internal-only och kräver Supabase auth för åtkomst.
 *
 * NOTERA: AWS Account ID och infrastruktur-detaljer är avsiktligt
 * tillgängliga för teamet — detta är ett internt operations-verktyg.
 *
 * Om systemet någonsin görs publikt: flytta till /api/infrastructure
 * med Bearer auth-gating på ECS-servern.
 */

// ─── Wavult OS — Service Registry ────────────────────────────────────────────
// Fullständig infrastrukturregister för Wavult Group

import type { ServiceDefinition, InfraHealthCheck } from './infraTypes'

export const SERVICE_REGISTRY: ServiceDefinition[] = [
  // ─── COMPUTE ─────────────────────────────────────────────────────────────
  {
    id: 'wavult-api',
    // ECS service name: wavult-api (deployed as wavult-api in cluster hypbit)
    name: 'Wavult API (wavult-api)',
    category: 'compute',
    provider: 'aws',
    endpoint: 'https://api.wavult.com/health',
    region: 'eu-north-1',
    criticalityLevel: 1,
    owner: 'group-cto',
    refCode: 'WG-TECH-2026-001',
    status: 'unknown',
    lastChecked: null,
    uptime30d: 99.2,
    billing: {
      provider: 'aws',
      accountId: '155407238699',
      monthlyEstimate: 800,
      billingEmail: 'erik@wavult.com',
      status: 'active',
    },
    failover: {
      primary: 'wavult-api',
      autoFailover: true,
      rto: '5 min',
      rpo: '0 min',
    },
    alerts: [],
    settings: {
      'ecs.service': 'wavult-api',
      'ecs.desired_count': 1,
      'ecs.min_count': 1,
      'ecs.max_count': 3,
      'ecs.cpu': 256,
      'ecs.memory': 512,
      'ecs.cluster': 'wavult',
      'ecs.region': 'eu-north-1',
    },
  },
  {
    id: 'quixzoom-api',
    name: 'quiXzoom API',
    category: 'compute',
    provider: 'aws',
    region: 'eu-north-1',
    criticalityLevel: 1,
    owner: 'group-cto',
    refCode: 'WG-TECH-2026-004',
    status: 'unknown',
    lastChecked: null,
    billing: {
      provider: 'aws',
      accountId: '155407238699',
      monthlyEstimate: 400,
      billingEmail: 'erik@wavult.com',
      status: 'active',
    },
    alerts: [],
    settings: {
      'ecs.cluster': 'wavult',
      'ecs.service': 'quixzoom-api',
    },
  },

  // ─── DATABASER ────────────────────────────────────────────────────────────
  {
    id: 'supabase-wavult',
    name: 'Supabase — Wavult OS',
    category: 'database',
    provider: 'supabase',
    region: 'eu-west-1',
    criticalityLevel: 1,
    owner: 'group-cto',
    refCode: 'WG-TECH-2026-005',
    status: 'unknown',
    lastChecked: null,
    billing: {
      provider: 'supabase',
      monthlyEstimate: 250,
      billingEmail: 'erik@wavult.com',
      status: 'active',
    },
    alerts: [],
    settings: {
      'project.id': 'znmxtnxxjpmgtycmsqjv',
      'project.name': 'wavult',
      'plan': 'free',
    },
  },
  {
    id: 'supabase-quixzoom',
    name: 'Supabase — quiXzoom (quixzoom-v2)',
    category: 'database',
    provider: 'supabase',
    region: 'eu-west-1',
    criticalityLevel: 1,
    owner: 'group-cto',
    refCode: 'WG-TECH-2026-006',
    status: 'unknown',
    lastChecked: null,
    billing: {
      provider: 'supabase',
      monthlyEstimate: 250,
      billingEmail: 'erik@wavult.com',
      status: 'active',
    },
    alerts: [],
    settings: {
      'project.id': 'lpeipzdmnnlbcoxlfhoe',
      'project.name': 'quixzoom-v2',
      'plan': 'free',
    },
  },

  // ─── LAGRING ──────────────────────────────────────────────────────────────
  {
    id: 's3-eu-primary',
    name: 'S3 — EU Primary (wavult-images-eu-primary)',
    category: 'storage',
    provider: 'aws',
    region: 'eu-north-1',
    criticalityLevel: 1,
    owner: 'group-cto',
    refCode: 'WG-TECH-2026-007',
    status: 'unknown',
    lastChecked: null,
    failover: {
      primary: 's3-eu-primary',
      secondary: 's3-eu-backup',
      autoFailover: true,
      rto: '1 min',
      rpo: '1 timme',
    },
    billing: {
      provider: 'aws',
      accountId: '155407238699',
      monthlyEstimate: 50,
      billingEmail: 'erik@wavult.com',
      status: 'active',
    },
    alerts: [],
    settings: {
      'bucket': 'wavult-images-eu-primary',
      'crr.target': 'wavult-images-eu-backup',
      'crr.storage_class': 'STANDARD_IA',
    },
  },
  {
    id: 's3-eu-backup',
    name: 'S3 — EU Backup (wavult-images-eu-backup)',
    category: 'storage',
    provider: 'aws',
    region: 'eu-west-1',
    criticalityLevel: 2,
    owner: 'group-cto',
    refCode: 'WG-TECH-2026-008',
    status: 'unknown',
    lastChecked: null,
    alerts: [],
    billing: {
      provider: 'aws',
      accountId: '155407238699',
      monthlyEstimate: 20,
      billingEmail: 'erik@wavult.com',
      status: 'active',
    },
    settings: {
      'bucket': 'wavult-images-eu-backup',
      'storage_class': 'STANDARD_IA',
    },
  },
  {
    id: 's3-us-primary',
    name: 'S3 — US Primary (wavult-images-us-primary)',
    category: 'storage',
    provider: 'aws',
    region: 'us-east-1',
    criticalityLevel: 1,
    owner: 'group-cto',
    refCode: 'WG-TECH-2026-009',
    status: 'unknown',
    lastChecked: null,
    alerts: [],
    billing: {
      provider: 'aws',
      accountId: '155407238699',
      monthlyEstimate: 50,
      billingEmail: 'erik@wavult.com',
      status: 'active',
    },
    settings: {
      'bucket': 'wavult-images-us-primary',
    },
  },
  {
    id: 's3-us-backup',
    name: 'S3 — US Backup (wavult-images-us-backup)',
    category: 'storage',
    provider: 'aws',
    region: 'us-west-2',
    criticalityLevel: 2,
    owner: 'group-cto',
    refCode: 'WG-TECH-2026-014',
    status: 'unknown',
    lastChecked: null,
    alerts: [],
    billing: {
      provider: 'aws',
      accountId: '155407238699',
      monthlyEstimate: 20,
      billingEmail: 'erik@wavult.com',
      status: 'active',
    },
    settings: {
      'bucket': 'wavult-images-us-backup',
      'storage_class': 'STANDARD_IA',
    },
  },

  // ─── CDN / FRONTEND ───────────────────────────────────────────────────────
  {
    id: 'cf-wavult-os',
    name: 'Cloudflare Pages — Wavult OS',
    category: 'cdn',
    provider: 'cloudflare',
    endpoint: 'https://wavult-os.pages.dev',
    criticalityLevel: 1,
    owner: 'group-cto',
    refCode: 'WG-TECH-2026-010',
    status: 'unknown',
    lastChecked: null,
    billing: {
      provider: 'cloudflare',
      monthlyEstimate: 0,
      billingEmail: 'erik@wavult.com',
      status: 'active',
    },
    alerts: [],
    settings: {
      'project': 'wavult-os',
      'zone': '5bed27e91d719b3f9d82c234d191ad99',
    },
  },
  {
    id: 'cf-quixzoom-landing',
    name: 'Cloudflare Pages — quiXzoom Landing',
    category: 'cdn',
    provider: 'cloudflare',
    endpoint: 'https://quixzoom-landing.pages.dev',
    criticalityLevel: 2,
    owner: 'group-cto',
    refCode: 'WG-TECH-2026-015',
    status: 'unknown',
    lastChecked: null,
    billing: {
      provider: 'cloudflare',
      monthlyEstimate: 0,
      billingEmail: 'erik@wavult.com',
      status: 'active',
    },
    alerts: [],
    settings: { 'project': 'quixzoom-landing' },
  },
  {
    id: 'cf-optical-insight-eu',
    name: 'Cloudflare Pages — Optical Insight EU',
    category: 'cdn',
    provider: 'cloudflare',
    endpoint: 'https://optical-insight-eu.pages.dev',
    criticalityLevel: 2,
    owner: 'group-cto',
    refCode: 'WG-TECH-2026-016',
    status: 'unknown',
    lastChecked: null,
    billing: {
      provider: 'cloudflare',
      monthlyEstimate: 0,
      billingEmail: 'erik@wavult.com',
      status: 'active',
    },
    alerts: [],
    settings: { 'project': 'optical-insight-eu' },
  },

  // ─── EXTERNA APIer ────────────────────────────────────────────────────────
  {
    id: 'whoop-api',
    name: 'WHOOP Developer API',
    category: 'api',
    provider: 'whoop',
    endpoint: 'https://api.prod.whoop.com',
    criticalityLevel: 2,
    owner: 'group-cto',
    refCode: 'WG-TECH-2026-011',
    status: 'unknown',
    lastChecked: null,
    alerts: [],
    billing: {
      provider: 'other',
      monthlyEstimate: 0,
      billingEmail: 'erik@wavult.com',
      status: 'active',
    },
    settings: {
      'client_id': 'se credentials.env',
      'redirect_uri': 'https://api.wavult.com/whoop/callback',
      'mode': 'development',
      'production_access': 'pending',
    },
  },
  {
    id: 'mapbox-api',
    name: 'Mapbox API',
    category: 'api',
    provider: 'mapbox',
    criticalityLevel: 2,
    owner: 'group-cto',
    refCode: 'WG-TECH-2026-012',
    status: 'unknown',
    lastChecked: null,
    alerts: [],
    billing: {
      provider: 'mapbox',
      monthlyEstimate: 50,
      billingEmail: 'erik@wavult.com',
      status: 'active',
    },
    settings: {
      'account': 'certified12',
      'token_type': 'public',
    },
  },
  {
    id: 'stripe',
    name: 'Stripe (betalningar)',
    category: 'payment',
    provider: 'stripe',
    criticalityLevel: 1,
    owner: 'cfo',
    refCode: 'WG-FIN-2026-004',
    status: 'unknown',
    lastChecked: null,
    alerts: [
      {
        id: 'alert-stripe-001',
        serviceId: 'stripe',
        severity: 'warning',
        message: 'STRIPE_SECRET_KEY inte konfigurerat — betalfunktioner inaktiva',
        createdAt: '2026-03-28T00:00:00Z',
        resolvedAt: null,
      },
    ],
    billing: {
      provider: 'stripe',
      monthlyEstimate: 0,
      billingEmail: 'erik@wavult.com',
      status: 'trial',
    },
    settings: {
      'configured': false,
      'mode': 'not_configured',
    },
  },

  // ─── CI/CD ────────────────────────────────────────────────────────────────
  {
    id: 'github-actions',
    name: 'GitHub Actions (CI/CD)',
    category: 'monitoring',
    provider: 'github',
    criticalityLevel: 2,
    owner: 'group-cto',
    refCode: 'WG-TECH-2026-013',
    status: 'unknown',
    lastChecked: null,
    alerts: [],
    billing: {
      provider: 'github',
      monthlyEstimate: 0,
      billingEmail: 'erik@wavult.com',
      status: 'active',
    },
    settings: {
      'repo': 'wolfoftyreso-debug/wavult-os',
      'branch': 'main',
    },
  },
]

export const HEALTH_CHECKS: InfraHealthCheck[] = [
  {
    serviceId: 'wavult-api',
    url: 'https://api.wavult.com/health',
    method: 'GET',
    expectedStatus: 200,
    timeout: 5000,
    interval: 60,
  },
  {
    serviceId: 'cf-wavult-os',
    url: 'https://wavult-os.pages.dev',
    method: 'HEAD',
    expectedStatus: 200,
    timeout: 5000,
    interval: 300,
  },
  {
    serviceId: 'whoop-api',
    url: 'https://api.prod.whoop.com',
    method: 'HEAD',
    expectedStatus: 200,
    timeout: 5000,
    interval: 300,
  },
]

// ─── Totalt månadsestimering ──────────────────────────────────────────────────

export function getTotalMonthlyCost(): number {
  return SERVICE_REGISTRY.reduce((sum, s) => sum + (s.billing?.monthlyEstimate ?? 0), 0)
}

export function getServiceById(id: string): ServiceDefinition | undefined {
  return SERVICE_REGISTRY.find(s => s.id === id)
}

export function getServicesByCategory(
  category: ServiceDefinition['category']
): ServiceDefinition[] {
  return SERVICE_REGISTRY.filter(s => s.category === category)
}

export function getCriticalServices(): ServiceDefinition[] {
  return SERVICE_REGISTRY.filter(s => s.criticalityLevel === 1)
}

export function getAllActiveAlerts() {
  return SERVICE_REGISTRY.flatMap(s =>
    s.alerts.filter(a => a.resolvedAt === null)
  )
}
