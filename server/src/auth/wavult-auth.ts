// Wavult Auth — replaces Supabase Auth
// Uses our own RDS + JWT

import jwt from 'jsonwebtoken'
import { query } from '../db/rds-client'
import crypto from 'crypto'

const JWT_SECRET = process.env.JWT_SECRET || process.env.WAVULT_JWT_SECRET || 'changeme'

export interface WavultUser {
  id: string
  email: string
  role: string
  entity_id?: string
}

export async function verifyToken(token: string): Promise<WavultUser | null> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as WavultUser
    return decoded
  } catch {
    return null
  }
}

export async function generateMagicLink(email: string, redirectTo: string): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex')
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h

  // Store in RDS
  await query(`
    INSERT INTO auth_magic_links (token, email, redirect_to, expires_at, used)
    VALUES ($1, $2, $3, $4, false)
    ON CONFLICT (email) DO UPDATE SET token=$1, expires_at=$4, used=false
  `, [token, email, redirectTo, expires])

  return token
}

export async function verifyMagicLink(token: string): Promise<{ email: string; redirectTo: string } | null> {
  const result = await query(`
    SELECT email, redirect_to FROM auth_magic_links 
    WHERE token = $1 AND expires_at > NOW() AND used = false
  `, [token])

  if (!result.rows.length) return null

  // Mark as used
  await query(`UPDATE auth_magic_links SET used = true WHERE token = $1`, [token])

  return { email: result.rows[0].email, redirectTo: result.rows[0].redirect_to }
}

export async function issueJWT(user: WavultUser): Promise<string> {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '7d' })
}
