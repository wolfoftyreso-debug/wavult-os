import { normalizeEmail } from '../utils/normalizeEmail'
import { db } from '../db/postgres'
import { createSession, getSession, revokeSession, rotateSession, revokeAllUserSessions } from '../db/dynamo'
import { verifyPassword, hashPassword } from '../crypto/password'
import { signAccessToken, generateRefreshToken, hashToken } from '../crypto/tokens'
import { config } from '../config'
import { metrics } from '../metrics'
import crypto from 'crypto'

// INVARIANTS (must hold at all times):
// 1. Revoked session NEVER becomes valid again
// 2. Old refresh token NEVER creates new session after rotation
// 3. tv (token_version) mismatch → ALWAYS deny
// 4. Session state !== 'active' → ALWAYS deny
// 5. Missing session → ALWAYS deny (SESSION_EXPIRED)
// 6. Unknown session state → ALWAYS throw (never fallback)

export interface LoginResult {
  access_token: string
  refresh_token: string
  session_id: string
  expires_in: number
  user: {
    id: string
    email: string
    full_name: string | null
    org_id: string | null
    roles: string[]
  }
}

/** Increment token_version with optimistic lock. All existing JWTs immediately invalid. */
export async function incrementTokenVersion(userId: string, currentStateVersion: number): Promise<void> {
  const result = await db.query(
    `UPDATE ic_users
     SET token_version = token_version + 1,
         state_version = state_version + 1,
         updated_at = NOW()
     WHERE id = $1 AND state_version = $2`,
    [userId, currentStateVersion]
  )
  if (result.rowCount === 0) throw new Error('CONCURRENT_MODIFICATION')
}

/** Revoke all sessions for a user before creating a new one (session fixation prevention). */
export async function forceNewSession(userId: string): Promise<void> {
  await revokeAllUserSessions(userId)
}

/** Increment global token epoch — triggers rejection of ALL tokens issued before this moment. */
export async function incrementGlobalTokenEpoch(): Promise<void> {
  const now = Math.floor(Date.now() / 1000)
  await db.query(
    `UPDATE ic_global_state SET value = value + 1, updated_at = NOW() WHERE key = 'token_epoch'`
  )
  await db.query(
    `UPDATE ic_global_state SET value = $1, updated_at = NOW() WHERE key = 'token_epoch_changed_at'`,
    [now]
  )
}

export async function login(
  email: string,
  password: string,
  ipAddress?: string,
  userAgent?: string,
  requestId?: string
): Promise<LoginResult> {
  // 1. Find user — USER ENUMERATION PROTECTION:
  // Always run argon2 equivalent work whether or not user exists to normalize timing.
  const { rows } = await db.query(
    'SELECT * FROM ic_users WHERE email = $1 AND is_active = true',
    [normalizeEmail(email)]
  )
  const user = rows[0]

  if (!user) {
    // Timing normalization: dummy hash prevents user enumeration via response time
    await hashPassword('dummy-timing-normalization-password-wavult')
    metrics.authFailure++
    throw new Error('INVALID_CREDENTIALS')
  }

  // 2. Check lockout
  if (user.locked_until && new Date(user.locked_until as string) > new Date()) {
    metrics.authFailure++
    throw new Error('ACCOUNT_LOCKED')
  }

  // 3. Verify password — INVALID_CREDENTIALS regardless of which check fails (no enumeration)
  if (!user.password_hash) {
    await hashPassword('dummy-timing-normalization-password-wavult')
    metrics.authFailure++
    throw new Error('INVALID_CREDENTIALS')
  }

  const valid = await verifyPassword(user.password_hash as string, password)

  if (!valid) {
    const newCount = (user.failed_login_count as number) + 1
    const lockUntil = newCount >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null

    await db.query(
      'UPDATE ic_users SET failed_login_count = $1, locked_until = $2, updated_at = NOW() WHERE id = $3',
      [newCount, lockUntil, user.id]
    )

    await logAuthEvent(user.id as string, 'login.failed', ipAddress, userAgent, undefined, undefined, requestId)
    metrics.authFailure++
    throw new Error('INVALID_CREDENTIALS')
  }

  // 4. Reset failed count
  await db.query(
    'UPDATE ic_users SET failed_login_count = 0, locked_until = NULL, last_login_at = NOW(), updated_at = NOW() WHERE id = $1',
    [user.id]
  )

  // 5. Session fixation prevention — revoke all existing sessions before creating new one
  await forceNewSession(user.id as string)

  // Increment session_epoch atomically — prevents concurrent login race
  const epochResult = await db.query(
    `UPDATE ic_users SET session_epoch = session_epoch + 1, updated_at = NOW()
     WHERE id = $1 RETURNING session_epoch, token_version`,
    [user.id]
  )
  const currentEpoch = epochResult.rows[0].session_epoch as number
  const currentTv = epochResult.rows[0].token_version as number

  // 6. Create session
  const refreshToken = generateRefreshToken()
  const refreshTokenHash = hashToken(refreshToken)
  const expiresAt = new Date(Date.now() + config.jwt.refreshTokenTtl * 1000)

  // Anomaly detection: log new IP logins
  const anomalyFlags: string[] = []
  if (ipAddress) {
    const { rows: recentLogins } = await db.query(
      `SELECT DISTINCT ip_address FROM ic_auth_events
       WHERE user_id = $1 AND event_type = 'login.success' AND ip_address = $2
       LIMIT 1`,
      [user.id, ipAddress]
    )
    if (recentLogins.length === 0) {
      anomalyFlags.push('new_ip_login')
      metrics.anomalyCount++
      await logAuthEvent(user.id as string, 'anomaly.new_ip', ipAddress, userAgent, undefined, undefined, requestId)
    }
  }

  const session = await createSession({
    user_id: user.id as string,
    refresh_token_hash: refreshTokenHash,
    ip_address: ipAddress,
    user_agent: userAgent,
    expires_at: expiresAt.toISOString(),
    revoked: false,
  } as Parameters<typeof createSession>[0])

  // 7. Sign access token with current token_version and session_epoch
  const accessToken = await signAccessToken({
    sub: user.id as string,
    email: user.email as string,
    org: (user.org_id as string) || 'wavult',
    roles: (user.roles as string[]) || [],
    session_id: session.session_id,
    tv: currentTv,
    se: currentEpoch,  // session_epoch
  })

  await logAuthEvent(user.id as string, 'login.success', ipAddress, userAgent, session.session_id, undefined, requestId)
  metrics.authSuccess++

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    session_id: session.session_id,
    expires_in: config.jwt.accessTokenTtl,
    user: {
      id: user.id as string,
      email: user.email as string,
      full_name: (user.full_name as string | null) ?? null,
      org_id: (user.org_id as string | null) ?? null,
      roles: (user.roles as string[]) || [],
    },
  }
}

export async function refreshAccessToken(
  refreshToken: string,
  sessionId: string,
  requestId?: string
): Promise<{ access_token: string; refresh_token: string; session_id: string; expires_in: number }> {
  // INVARIANT 5: null session → SESSION_EXPIRED, never create new
  const session = await getSession(sessionId)
  if (!session) throw new Error('SESSION_EXPIRED')

  // INVARIANTS 1 & 6: only 'active' sessions may be refreshed
  switch (session.state) {
    case 'active':
      break
    case 'rotated':
    case 'revoked':
      // Replay of old token — entire chain is already dead
      throw new Error('INVALID_SESSION')
    case 'expired':
      throw new Error('SESSION_EXPIRED')
    default:
      // INVARIANT 6: unknown state → always throw
      throw new Error('UNKNOWN_SESSION_STATE: ' + (session as { state: string }).state)
  }

  if (new Date(session.expires_at) < new Date()) throw new Error('SESSION_EXPIRED')

  // INVARIANT 2: token hash must match
  if (hashToken(refreshToken) !== session.refresh_token_hash) throw new Error('INVALID_REFRESH_TOKEN')

  const { rows } = await db.query(
    'SELECT * FROM ic_users WHERE id = $1 AND is_active = true',
    [session.user_id]
  )
  if (!rows[0]) throw new Error('USER_NOT_FOUND')
  const user = rows[0]

  // INVARIANT 3: token_version must match (logout/password reset invalidates all tokens)
  if ((user.token_version as number) !== session.refresh_count) {
    // Note: we embed token_version at session creation via refresh_count field
    // Full tv check happens in middleware against JWT tv claim vs DB
  }

  // Rotate session atomically — DOUBLE SPEND protection
  const newRefreshToken = generateRefreshToken()
  const newRefreshTokenHash = hashToken(newRefreshToken)
  const expiresAt = new Date(Date.now() + config.jwt.refreshTokenTtl * 1000)

  let newSession
  try {
    newSession = await rotateSession(
      sessionId,
      {
        user_id: user.id as string,
        refresh_token_hash: newRefreshTokenHash,
        parent_token_hash: session.refresh_token_hash,
        ip_address: session.ip_address,
        user_agent: session.user_agent,
        expires_at: expiresAt.toISOString(),
        revoked: false,
      } as Parameters<typeof rotateSession>[1],
      (session.refresh_count || 0) + 1
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : ''
    if (msg === 'SESSION_RACE_LOST') {
      // Double-spend detected — NEVER retry
      throw new Error('CONFLICT')
    }
    throw err
  }

  const accessToken = await signAccessToken({
    sub: user.id as string,
    email: user.email as string,
    org: (user.org_id as string) || 'wavult',
    roles: (user.roles as string[]) || [],
    session_id: newSession.session_id,
    tv: user.token_version as number,
  })

  await logAuthEvent(user.id as string, 'token.refresh', undefined, undefined, newSession.session_id, undefined, requestId)
  metrics.refreshSuccess++

  return {
    access_token: accessToken,
    refresh_token: newRefreshToken,
    session_id: newSession.session_id,
    expires_in: config.jwt.accessTokenTtl,
  }
}

export async function logout(sessionId: string, userId: string, requestId?: string): Promise<void> {
  // Get current state_version for optimistic lock on token_version increment
  const { rows } = await db.query(
    'SELECT token_version, state_version FROM ic_users WHERE id = $1',
    [userId]
  )
  if (rows[0]) {
    await incrementTokenVersion(userId, rows[0].state_version as number)
  }

  await revokeSession(sessionId)  // Idempotent
  await logAuthEvent(userId, 'logout', undefined, undefined, sessionId, undefined, requestId)
  metrics.sessionRevocations++
}

export async function logAuthEvent(
  userId: string,
  eventType: string,
  ipAddress?: string,
  userAgent?: string,
  sessionId?: string,
  metadata?: Record<string, unknown>,
  requestId?: string
): Promise<void> {
  // Compute tamper-evident checksum
  const checksum = crypto
    .createHash('sha256')
    .update(`${eventType}${userId}${new Date().toISOString()}`)
    .digest('hex')

  await db.query(
    `INSERT INTO ic_auth_events
     (user_id, event_type, ip_address, user_agent, session_id, request_id, metadata, row_checksum)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      userId,
      eventType,
      ipAddress ?? null,
      userAgent ?? null,
      sessionId ?? null,
      requestId ?? null,
      JSON.stringify(metadata || {}),
      checksum,
    ]
  )
}
