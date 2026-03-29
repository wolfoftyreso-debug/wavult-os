import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import * as crypto from 'crypto'

const ssm = new SSMClient({ region: 'eu-north-1' })

export interface RevolutConfig {
  clientId: string
  privateKeyPath: string
  refreshToken: string
}

let cachedConfig: RevolutConfig | null = null

export async function getRevolutConfig(): Promise<RevolutConfig> {
  if (cachedConfig) return cachedConfig

  if (process.env.NODE_ENV === 'production') {
    const [clientIdRes, refreshTokenRes, privateKeyRes] = await Promise.all([
      ssm.send(new GetParameterCommand({ Name: '/wavult/prod/REVOLUT_CLIENT_ID', WithDecryption: true })),
      ssm.send(new GetParameterCommand({ Name: '/wavult/prod/REVOLUT_REFRESH_TOKEN', WithDecryption: true })),
      ssm.send(new GetParameterCommand({ Name: '/wavult/prod/REVOLUT_PRIVATE_KEY', WithDecryption: true })),
    ])

    const keyPath = path.join(os.tmpdir(), 'revolut_private.pem')
    fs.writeFileSync(keyPath, privateKeyRes.Parameter!.Value!, { mode: 0o600 })

    cachedConfig = {
      clientId: clientIdRes.Parameter!.Value!,
      privateKeyPath: keyPath,
      refreshToken: refreshTokenRes.Parameter!.Value!,
    }
  } else {
    cachedConfig = {
      clientId: process.env.REVOLUT_BUSINESS_CLIENT_ID || '',
      privateKeyPath: process.env.REVOLUT_BUSINESS_PRIVATE_KEY || '',
      refreshToken: process.env.REVOLUT_REFRESH_TOKEN || '',
    }
  }

  return cachedConfig
}

export async function getRevolutAccessToken(): Promise<string> {
  const config = await getRevolutConfig()
  const now = Math.floor(Date.now() / 1000)

  const b64url = (d: string) => Buffer.from(d).toString('base64url')
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const payload = b64url(JSON.stringify({
    iss: 'api.wavult.com',
    sub: config.clientId,
    aud: 'https://revolut.com',
    iat: now,
    exp: now + 2400,
    jti: crypto.randomUUID(),
  }))

  const privateKey = fs.readFileSync(config.privateKeyPath, 'utf8')
  const sign = crypto.createSign('SHA256')
  sign.update(`${header}.${payload}`)
  const sig = sign.sign(privateKey, 'base64url')
  const jwt = `${header}.${payload}.${sig}`

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: config.refreshToken,
    client_id: config.clientId,
    client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
    client_assertion: jwt,
  })

  const resp = await fetch('https://b2b.revolut.com/api/1.0/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!resp.ok) {
    const err = await resp.text()
    throw new Error(`Revolut token refresh failed ${resp.status}: ${err}`)
  }

  const data = await resp.json() as { access_token: string; refresh_token?: string }

  // Update refresh token in SSM if rotated
  if (data.refresh_token && data.refresh_token !== config.refreshToken) {
    await ssm.send(new GetParameterCommand({ Name: '/wavult/prod/REVOLUT_REFRESH_TOKEN' }))
    // Note: update SSM with new refresh token
    if (cachedConfig) cachedConfig.refreshToken = data.refresh_token
  }

  return data.access_token
}
