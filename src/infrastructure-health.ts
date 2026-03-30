// ─── Wavult OS — Infrastructure Health Router ────────────────────────────────
// GET /v1/infrastructure/health  — live ECS + CloudFront status
// Public endpoint (no auth) — internal network only in prod

import { Router, Request, Response } from 'express'
import {
  ECSClient,
  DescribeServicesCommand,
  ListServicesCommand,
} from '@aws-sdk/client-ecs'
// @aws-sdk/client-cloudfront not installed — CloudFront status via ELB health only

const router = Router()

// ─── Config ──────────────────────────────────────────────────────────────────

const AWS_REGION = process.env.AWS_REGION || 'eu-north-1'
const ECS_CLUSTER = process.env.ECS_CLUSTER || 'hypbit'

const ECS_SERVICES = [
  { id: 'wavult-os-api',  name: 'Wavult OS API',  serviceName: 'wavult-os-api'  },
  { id: 'quixzoom-api',   name: 'quiXzoom API',   serviceName: 'quixzoom-api'   },
  { id: 'n8n',            name: 'n8n',             serviceName: 'n8n'            },
  { id: 'team-pulse',     name: 'Team Pulse',      serviceName: 'team-pulse'     },
]

// CloudFront distributions — status via HTTP probe (no SDK needed)
const CF_DISTRIBUTIONS = [
  { id: 'E2QUO7HIHWWP18', name: 'app.quixzoom.com',  url: 'https://app.quixzoom.com'  },
  { id: 'EE30B9WM5ZYM7',  name: 'quixzoom.com',      url: 'https://quixzoom.com'      },
  { id: 'E2JOYHG1LYOXGM', name: 'hypbit.com',        url: 'https://hypbit.com'        },
  { id: 'E2Z3B93KJXH71F', name: 'app.hypbit.com',    url: 'https://app.hypbit.com'    },
]

// ─── Status helpers ───────────────────────────────────────────────────────────

type ServiceStatus = 'operational' | 'degraded' | 'down' | 'unknown'

function ecsStatus(running: number, desired: number): ServiceStatus {
  if (desired === 0) return 'unknown'
  if (running === desired) return 'operational'
  if (running > 0) return 'degraded'
  return 'down'
}

// ─── Fetch ECS services ───────────────────────────────────────────────────────

async function fetchECSServices() {
  const client = new ECSClient({ region: AWS_REGION })

  const serviceArns = ECS_SERVICES.map(s => s.serviceName)

  const cmd = new DescribeServicesCommand({
    cluster: ECS_CLUSTER,
    services: serviceArns,
  })

  const res = await client.send(cmd)
  const services = res.services ?? []
  const failures = res.failures ?? []

  return ECS_SERVICES.map(def => {
    const svc = services.find(
      s => s.serviceName === def.serviceName || s.serviceArn?.endsWith(def.serviceName)
    )
    const failure = failures.find(f => f.arn?.endsWith(def.serviceName))

    if (failure || !svc) {
      return {
        id: def.id,
        name: def.name,
        provider: 'aws' as const,
        category: 'compute' as const,
        status: 'unknown' as ServiceStatus,
        runningCount: 0,
        desiredCount: 0,
        pendingCount: 0,
        latency: null as number | null,
        region: AWS_REGION,
        lastEvent: failure?.reason ?? 'Service not found',
      }
    }

    const running = svc.runningCount ?? 0
    const desired = svc.desiredCount ?? 0
    const pending = svc.pendingCount ?? 0

    // Last event message
    const lastEvent = svc.events?.[0]?.message ?? null

    // Detect active deployment (rolling update in progress)
    const activeDeployments = (svc.deployments ?? []).filter(
      d => d.status === 'PRIMARY' && (d.pendingCount ?? 0) > 0
    )
    const isDeploying = activeDeployments.length > 0

    const status = isDeploying ? 'degraded' : ecsStatus(running, desired)

    return {
      id: def.id,
      name: def.name,
      provider: 'aws' as const,
      category: 'compute' as const,
      status,
      runningCount: running,
      desiredCount: desired,
      pendingCount: pending,
      latency: null as number | null,
      region: AWS_REGION,
      lastEvent: isDeploying ? `Deploying — ${lastEvent ?? ''}` : (lastEvent ?? ''),
    }
  })
}

// ─── Probe CloudFront distributions via HTTP HEAD ────────────────────────────

async function fetchCloudFrontDistributions() {
  const probes = CF_DISTRIBUTIONS.map(async def => {
    const start = Date.now()
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5_000)
      const res = await fetch(def.url, {
        method: 'HEAD',
        signal: controller.signal,
        redirect: 'follow',
      })
      clearTimeout(timeout)
      const latency = Date.now() - start
      const status: ServiceStatus = res.ok || res.status < 500 ? 'operational' : 'degraded'
      return {
        id: def.id, name: def.name,
        provider: 'cloudflare' as const,
        category: 'cdn' as const,
        status, latency,
        region: 'global',
        lastEvent: `HTTP ${res.status} in ${latency}ms`,
      }
    } catch {
      return {
        id: def.id, name: def.name,
        provider: 'cloudflare' as const,
        category: 'cdn' as const,
        status: 'down' as ServiceStatus,
        latency: null,
        region: 'global',
        lastEvent: 'Probe timeout or unreachable',
      }
    }
  })
  return Promise.all(probes)
}

// ─── Endpoint ─────────────────────────────────────────────────────────────────

router.get('/v1/infrastructure/health', async (_req: Request, res: Response) => {
  const startedAt = Date.now()

  // Run both fetches in parallel, fail gracefully
  const [ecsResult, cfResult] = await Promise.allSettled([
    fetchECSServices(),
    fetchCloudFrontDistributions(),
  ])

  const ecsServices = ecsResult.status === 'fulfilled'
    ? ecsResult.value
    : ECS_SERVICES.map(s => ({
        id: s.id,
        name: s.name,
        provider: 'aws' as const,
        category: 'compute' as const,
        status: 'unknown' as ServiceStatus,
        runningCount: 0,
        desiredCount: 0,
        pendingCount: 0,
        latency: null,
        region: AWS_REGION,
        lastEvent: String((ecsResult as PromiseRejectedResult).reason),
      }))

  const cfServices = cfResult.status === 'fulfilled'
    ? cfResult.value
    : CF_DISTRIBUTIONS.map(d => ({
        id: d.id,
        name: d.name,
        provider: 'cloudflare' as const,
        category: 'cdn' as const,
        status: 'unknown' as ServiceStatus,
        domainName: null,
        aliases: [],
        cfStatus: null,
        enabled: false,
        region: 'global',
        lastEvent: String((cfResult as PromiseRejectedResult).reason),
      }))

  const allServices = [...ecsServices, ...cfServices]

  // Summary
  const summary = {
    total: allServices.length,
    operational: allServices.filter(s => s.status === 'operational').length,
    degraded:    allServices.filter(s => s.status === 'degraded').length,
    down:        allServices.filter(s => s.status === 'down').length,
    unknown:     allServices.filter(s => s.status === 'unknown').length,
  }

  res.json({
    timestamp: new Date().toISOString(),
    latencyMs: Date.now() - startedAt,
    services: allServices,
    summary,
    errors: {
      ecs: ecsResult.status === 'rejected' ? String(ecsResult.reason) : null,
      cloudfront: cfResult.status === 'rejected' ? String(cfResult.reason) : null,
    },
  })
})

export default router
