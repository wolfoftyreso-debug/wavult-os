// ─── Communications Routes ─────────────────────────────────────────────────────
// GET /api/communications/inbox  — IMAP inbox (raw TLS, no extra deps)
// POST /api/communications/sms   — proxy to /api/sms/send

import { Router, Request, Response } from 'express'
import * as tls from 'tls'

const router = Router()

// ─── IMAP helper (raw protocol, no deps) ─────────────────────────────────────

interface EmailSummary {
  id: string
  uid: string
  from: string
  subject: string
  date: string
  read: boolean
  snippet: string
}

function fetchImapInbox(limit = 20): Promise<EmailSummary[]> {
  return new Promise((resolve) => {
    const host = process.env.IMAP_HOST ?? 'mailcluster.loopia.se'
    const user = process.env.IMAP_USER ?? ''
    const pass = process.env.IMAP_PASS ?? ''

    if (!user || !pass) {
      resolve([])
      return
    }

    const emails: EmailSummary[] = []
    let buffer = ''
    let tagCounter = 1
    let currentUid: string | null = null
    let phase: 'connecting' | 'login' | 'select' | 'search' | 'fetch' | 'done' = 'connecting'
    let uids: string[] = []

    const tag = () => `a${tagCounter++}`

    const sock = tls.connect(993, host, { rejectUnauthorized: false }, () => {
      // Connected — wait for greeting
    })

    const timeout = setTimeout(() => {
      try { sock.destroy() } catch { /* ok */ }
      resolve(emails)
    }, 15_000)

    const send = (cmd: string) => {
      try { sock.write(cmd + '\r\n') } catch { /* ignore */ }
    }

    sock.on('data', (chunk: Buffer) => {
      buffer += chunk.toString()
      const lines = buffer.split('\r\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (phase === 'connecting' && line.startsWith('* OK')) {
          phase = 'login'
          send(`${tag()} LOGIN "${user}" "${pass}"`)
          continue
        }

        if (phase === 'login' && /^a\d+ OK.*LOGIN/i.test(line)) {
          phase = 'select'
          send(`${tag()} SELECT INBOX`)
          continue
        }

        if (phase === 'login' && /^a\d+ (NO|BAD)/i.test(line)) {
          clearTimeout(timeout)
          sock.destroy()
          resolve([])
          return
        }

        if (phase === 'select' && /^a\d+ OK.*SELECT/i.test(line)) {
          phase = 'search'
          send(`${tag()} SEARCH ALL`)
          continue
        }

        if (phase === 'search' && line.startsWith('* SEARCH')) {
          const parts = line.replace('* SEARCH', '').trim().split(' ').filter(Boolean)
          uids = parts.slice(-limit).reverse() // latest first
          if (uids.length === 0) {
            phase = 'done'
            send(`${tag()} LOGOUT`)
            clearTimeout(timeout)
            sock.destroy()
            resolve(emails)
            return
          }
          phase = 'fetch'
          const nextUid = uids.shift()!
          currentUid = nextUid
          send(`${tag()} FETCH ${nextUid} (FLAGS BODY[HEADER.FIELDS (FROM SUBJECT DATE)])`)
          continue
        }

        if (phase === 'fetch') {
          // Parse fetch response
          if (line.startsWith('* ') && line.includes('FETCH')) {
            // New message boundary
          }
          if (/^From:/i.test(line)) {
            const fromVal = line.replace(/^From:/i, '').trim()
            const last = emails[emails.length - 1]
            if (last && !last.from) last.from = fromVal
          }
          if (/^Subject:/i.test(line)) {
            const subj = line.replace(/^Subject:/i, '').trim()
            const last = emails[emails.length - 1]
            if (last) last.subject = subj || '(inget ämne)'
          }
          if (/^Date:/i.test(line)) {
            const dateStr = line.replace(/^Date:/i, '').trim()
            const last = emails[emails.length - 1]
            if (last) last.date = dateStr
          }

          // FLAGS line
          if (line.includes('FLAGS') && line.includes('FETCH')) {
            const uid = currentUid ?? String(emails.length + 1)
            const read = line.includes('\\Seen')
            emails.push({
              id: uid,
              uid,
              from: '',
              subject: '',
              date: '',
              read,
              snippet: '',
            })
          }

          // Done with this message
          if (/^a\d+ OK.*FETCH/i.test(line)) {
            const nextUid = uids.shift()
            if (nextUid) {
              currentUid = nextUid
              send(`${tag()} FETCH ${nextUid} (FLAGS BODY[HEADER.FIELDS (FROM SUBJECT DATE)])`)
            } else {
              phase = 'done'
              send(`${tag()} LOGOUT`)
              clearTimeout(timeout)
              sock.destroy()
              resolve(emails)
              return
            }
          }
        }
      }
    })

    sock.on('error', () => {
      clearTimeout(timeout)
      resolve(emails)
    })

    sock.on('close', () => {
      clearTimeout(timeout)
      resolve(emails)
    })
  })
}

// ─── GET /api/communications/inbox ───────────────────────────────────────────

router.get('/api/communications/inbox', async (_req: Request, res: Response) => {
  try {
    const emails = await fetchImapInbox(20)
    return res.json({
      emails,
      count: emails.length,
      source: 'imap',
      timestamp: new Date().toISOString(),
    })
  } catch (err: unknown) {
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'IMAP-fel',
      emails: [],
      count: 0,
    })
  }
})

// ─── POST /api/communications/sms ────────────────────────────────────────────
// Proxy to 46elks via existing sms-router endpoint

router.post('/api/communications/sms', async (req: Request, res: Response) => {
  const { to, message, from: sender } = req.body ?? {}
  if (!to || !message) {
    return res.status(400).json({ error: 'to och message är obligatoriska' })
  }

  const username = process.env.FORTYSIX_ELKS_USERNAME
  const password = process.env.FORTYSIX_ELKS_PASSWORD
  if (!username || !password) {
    return res.status(503).json({ error: '46elks ej konfigurerat' })
  }

  try {
    const params = new URLSearchParams({
      from: sender ?? 'Wavult',
      to,
      message,
    })
    const creds = Buffer.from(`${username}:${password}`).toString('base64')
    const resp = await fetch('https://api.46elks.com/a1/sms', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${creds}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    })
    const data = await resp.json() as { id?: string; status?: string; message?: string }
    if (!resp.ok) return res.status(400).json({ error: data.message ?? 'SMS misslyckades' })
    return res.json({ ok: true, id: data.id, status: data.status })
  } catch (e: unknown) {
    return res.status(500).json({ error: e instanceof Error ? e.message : 'Serverfel' })
  }
})

export default router
