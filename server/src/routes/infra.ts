// ─── Infrastructure Routes ─────────────────────────────────────────────────────
// GET  /api/infra/status           — ECS services + domain status
// GET  /api/infra/logs/:service    — CloudWatch logs for a service
// POST /api/infra/restart/:service — Force new deployment for ECS service

import { Router, Request, Response } from 'express'

const router = Router()

const AWS_REGION = process.env.AWS_REGION ?? 'eu-north-1'
const ECS_CLUSTER = process.env.ECS_CLUSTER ?? 'hypbit'

// ─── AWS SDK helpers ─────────────────────────────────────────────────────────
// Using fetch against AWS APIs (avoid heavy SDK imports)
// Falls back gracefully if AWS creds not present

async function ecsDescribeServices(): Promise<{
  services: Array<{
    serviceName: string
    runningCount: number
    desiredCount: number
    status: string
  }>
}> {
  try {
    // Try to use ECS via backend SDK if available
    // Using dynamic require to avoid mandatory bundling
    const { ECSClient, DescribeServicesCommand, ListServicesCommand } = await import('@aws-sdk/client-ecs')

    const client = new ECSClient({ region: AWS_REGION })

    // List all services in cluster
    const list = await client.send(new ListServicesCommand({ cluster: ECS_CLUSTER, maxResults: 100 }))
    const serviceArns = list.serviceArns ?? []
    if (serviceArns.length === 0) return { services: [] }

    const desc = await client.send(new DescribeServicesCommand({
      cluster: ECS_CLUSTER,
      services: serviceArns,
    }))

    return {
      services: (desc.services ?? []).map(s => ({
        serviceName: s.serviceName ?? '',
        runningCount: s.runningCount ?? 0,
        desiredCount: s.desiredCount ?? 0,
        status: s.status ?? 'UNKNOWN',
      })),
    }
  } catch {
    return { services: [] }
  }
}

async function cloudwatchLogs(serviceName: string, limit = 50): Promise<Array<{
  timestamp: string
  level: string
  message: string
}>> {
  // CloudWatch Logs via AWS SDK v4 REST API (avoids hard dependency on @aws-sdk/client-cloudwatch-logs)
  // Falls back to empty array if credentials not available
  try {
    // Use dynamic import so missing SDK doesn't break at startup
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let CWLogsClient: any, DescribeLogStreamsCmd: any, GetLogEventsCmd: any
    try {
      const mod = await import('@aws-sdk/client-cloudwatch-logs' as string)
      CWLogsClient = mod.CloudWatchLogsClient
      DescribeLogStreamsCmd = mod.DescribeLogStreamsCommand
      GetLogEventsCmd = mod.GetLogEventsCommand
    } catch {
      return [] // SDK not installed
    }

    const client = new CWLogsClient({ region: AWS_REGION })
    const logGroupName = `/ecs/${serviceName}`

    const streams = await client.send(new DescribeLogStreamsCmd({
      logGroupName,
      orderBy: 'LastEventTime',
      descending: true,
      limit: 1,
    }))

    const streamName = streams.logStreams?.[0]?.logStreamName
    if (!streamName) return []

    const events = await client.send(new GetLogEventsCmd({
      logGroupName,
      logStreamName: streamName,
      limit,
      startFromHead: false,
    }))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (events.events ?? []).map((e: any) => {
      const msg = (e.message ?? '') as string
      let level = 'INFO'
      const levelMatch = msg.match(/\b(ERROR|WARN|WARNING|INFO|DEBUG|TRACE|FATAL|CRITICAL)\b/i)
      if (levelMatch) level = levelMatch[1].toUpperCase().replace('WARNING', 'WARN')
      return {
        timestamp: new Date(e.timestamp ?? Date.now()).toISOString(),
        level,
        message: msg.trim(),
      }
    }).reverse()
  } catch {
    return []
  }
}

// ─── GET /api/infra/status ────────────────────────────────────────────────────

router.get('/api/infra/status', async (_req: Request, res: Response) => {
  const [ecsData] = await Promise.all([ecsDescribeServices()])

  const services = ecsData.services.map(s => {
    const running = s.runningCount
    const desired = s.desiredCount
    let status: 'running' | 'degraded' | 'stopped' = 'running'
    if (running === 0) status = 'stopped'
    else if (running < desired) status = 'degraded'

    return {
      name: s.serviceName,
      running,
      desired,
      status,
    }
  }).sort((a, b) => a.name.localeCompare(b.name))

  // Domain status from Cloudflare (inline fetch to avoid circular dependency)
  let domains: Array<{ name: string; status: string; subdomain?: string; ns?: string }> = []
  try {
    const cfRes = await fetch(
      `https://api.cloudflare.com/client/v4/zones?account.id=${process.env.CF_ACCOUNT_ID ?? 'b65ff6fbc9b5a7a7da71bb0d3f1beb28'}&per_page=50`,
      {
        headers: {
          'X-Auth-Email': process.env.CF_EMAIL ?? '',
          'X-Auth-Key': process.env.CLOUDFLARE_API_TOKEN ?? '',
        },
      }
    )
    if (cfRes.ok) {
      const cfData = await cfRes.json() as {
        result: Array<{ name: string; status: string; name_servers: string[] }>
      }
      domains = (cfData.result ?? []).map(z => ({
        name: z.name,
        status: z.status === 'active' ? 'active' : 'pending',
        ns: z.name_servers?.[0] ?? '',
      }))
    }
  } catch {
    // CF unavailable — leave empty
  }

  res.json({
    cluster: ECS_CLUSTER,
    services,
    domains,
    timestamp: new Date().toISOString(),
  })
})

// ─── GET /api/infra/logs/:service ─────────────────────────────────────────────

router.get('/api/infra/logs/:service', async (req: Request, res: Response) => {
  const { service } = req.params
  const limit = Math.min(parseInt(String(req.query.limit ?? '50'), 10), 200)

  if (!service || !/^[\w-]+$/.test(service)) {
    return res.status(400).json({ error: 'Ogiltigt service-namn' })
  }

  const logs = await cloudwatchLogs(service, limit)
  return res.json({ service, logs, count: logs.length })
})

// ─── POST /api/infra/restart/:service ────────────────────────────────────────

router.post('/api/infra/restart/:service', async (req: Request, res: Response) => {
  const { service } = req.params

  if (!service || !/^[\w-]+$/.test(service)) {
    return res.status(400).json({ error: 'Ogiltigt service-namn' })
  }

  try {
    const { ECSClient, UpdateServiceCommand } = await import('@aws-sdk/client-ecs')
    const client = new ECSClient({ region: AWS_REGION })

    await client.send(new UpdateServiceCommand({
      cluster: ECS_CLUSTER,
      service,
      forceNewDeployment: true,
    }))

    return res.json({ success: true, message: `Force new deployment triggered for ${service}` })
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Serverfel' })
  }
})

export default router
