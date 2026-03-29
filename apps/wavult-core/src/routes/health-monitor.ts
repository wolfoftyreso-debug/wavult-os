import { Router } from 'express'
import { ECSClient, DescribeServicesCommand } from '@aws-sdk/client-ecs'
import { ElasticLoadBalancingV2Client } from '@aws-sdk/client-elastic-load-balancing-v2'

const router = Router()
const ecs = new ECSClient({ region: 'eu-north-1' })
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const elb = new ElasticLoadBalancingV2Client({ region: 'eu-north-1' })

const SERVICES = [
  { id: 'wavult-api', ecsName: 'hypbit-api', tgName: 'hypbit-api-tg', tgArn: 'arn:aws:elasticloadbalancing:eu-north-1:155407238699:targetgroup/hypbit-api-tg/PLACEHOLDER' },
  { id: 'quixzoom-api', ecsName: 'quixzoom-api', tgName: 'quixzoom-api-tg', tgArn: 'arn:aws:elasticloadbalancing:eu-north-1:155407238699:targetgroup/quixzoom-api-tg/PLACEHOLDER' },
  { id: 'identity-core', ecsName: 'identity-core', tgName: 'identity-core-tg', tgArn: 'arn:aws:elasticloadbalancing:eu-north-1:155407238699:targetgroup/identity-core-tg/PLACEHOLDER' },
  { id: 'n8n', ecsName: 'n8n', tgName: 'n8n-tg', tgArn: '' },
  { id: 'bos-scheduler', ecsName: 'bos-scheduler', tgName: '', tgArn: '' },
  { id: 'wavult-core', ecsName: 'wavult-core', tgName: '', tgArn: '' },
]

// GET /v1/infrastructure/health
router.get('/v1/infrastructure/health', async (_req, res) => {
  try {
    const { services } = await ecs.send(new DescribeServicesCommand({
      cluster: 'hypbit',
      services: SERVICES.map(s => s.ecsName),
    }))

    const results = SERVICES.map(svc => {
      const ecsSvc = services?.find(s => s.serviceName === svc.ecsName)
      const running = ecsSvc?.runningCount ?? 0
      const desired = ecsSvc?.desiredCount ?? 1
      const status = running === desired ? 'operational' : running === 0 ? 'down' : 'degraded'

      return {
        id: svc.id,
        name: svc.ecsName,
        status,
        running,
        desired,
        lastChecked: new Date().toISOString(),
      }
    })

    const downCount = results.filter(r => r.status === 'down').length
    const degradedCount = results.filter(r => r.status === 'degraded').length

    res.json({
      overall: downCount > 0 ? 'down' : degradedCount > 0 ? 'degraded' : 'operational',
      services: results,
      checkedAt: new Date().toISOString(),
    })
  } catch (err) {
    res.status(500).json({ error: 'Health check failed', detail: String(err) })
  }
})

export default router
