// Wavult Realtime — WebSocket server replacing Supabase Realtime
// Uses native ws + PostgreSQL LISTEN/NOTIFY

import { WebSocketServer, WebSocket } from 'ws'
import { query, getClient } from '../db/rds-client'

interface Subscription {
  ws: WebSocket
  table: string
  filter?: string
  userId: string
}

const subscriptions = new Map<string, Subscription[]>()

export function initRealtime(server: import('http').Server) {
  const wss = new WebSocketServer({ server, path: '/realtime/v1' })

  wss.on('connection', (ws, req) => {
    ws.on('message', async (data) => {
      try {
        const msg = JSON.parse(data.toString())
        if (msg.type === 'subscribe') {
          const { table, filter, userId } = msg
          const key = `${table}:${filter || '*'}`
          if (!subscriptions.has(key)) subscriptions.set(key, [])
          subscriptions.get(key)!.push({ ws, table, filter, userId })
          ws.send(JSON.stringify({ type: 'subscribed', table }))
        }
      } catch {}
    })

    ws.on('close', () => {
      // Remove dead subscriptions
      subscriptions.forEach((subs, key) => {
        subscriptions.set(key, subs.filter(s => s.ws !== ws))
      })
    })
  })

  // Listen for PostgreSQL notifications
  setupPgNotify()

  return wss
}

async function setupPgNotify() {
  const client = await getClient()
  await client.query('LISTEN table_changes')

  client.on('notification', (msg) => {
    if (!msg.payload) return
    try {
      const payload = JSON.parse(msg.payload)
      const { table, event, row } = payload

      // Broadcast to subscribers
      const key = `${table}:*`
      const subs = subscriptions.get(key) || []
      subs.forEach(sub => {
        if (sub.ws.readyState === WebSocket.OPEN) {
          sub.ws.send(JSON.stringify({ type: event, table, data: row }))
        }
      })
    } catch {}
  })
}
