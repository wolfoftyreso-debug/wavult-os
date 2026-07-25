/**
 * event-store — append-only, hash-chained domain event log.
 *
 * This is the ISO-by-design backbone of wavult-aero. Every state-changing
 * operation in the service writes an event here, and nothing else mutates
 * the aviation record. Queries reconstruct current state by folding events,
 * or by reading materialised projections (which themselves are rebuildable
 * from the log).
 *
 * Regulatory rationale:
 *   - EASA Part-145.A.55 requires maintenance records to be preserved,
 *     unaltered, and traceable to the person who made the entry.
 *   - AS9100D cl. 7.5.3 Control of Documented Information requires records
 *     to be protected from unintended alteration.
 *   - DO-326A / ED-202A requires tamper-evident audit trails for aircraft
 *     information system security environments.
 *   - GDPR Art. 5(1)(f) integrity and confidentiality.
 *
 * Implementation:
 *   - Each row contains prev_hash and this_hash.
 *   - this_hash = SHA-256( prev_hash || canonical_json(payload) || meta ).
 *   - The first row of a stream has prev_hash = 64 zeros.
 *   - A background verifier (verifyChain) walks the stream and returns the
 *     first break, if any. The service enters READ-ONLY mode on any break.
 *   - Rows are only ever INSERTed. There is no UPDATE path. A Postgres
 *     trigger (see migrations/001_aero_init.sql) rejects UPDATE/DELETE.
 *
 * This module does NOT encrypt payloads — classified fields must be
 * encrypted by the caller using lib/classification.ts before being passed
 * into appendEvent().
 *
 * Requirements traceability:
 *   @req AEAN-REQ-AUD-001  The domain event log shall be append-only and hash-chained
 *   @req AEAN-REQ-CNT-001  Content packs are signed and verifiable offline (via canonicalJson)
 */

import { createHash, randomUUID } from 'node:crypto'
import { PoolClient } from 'pg'
import { getPool, withTransaction } from './db'

export const ZERO_HASH = '0'.repeat(64)

export type EventClassification =
  | 'public'
  | 'internal'
  | 'restricted'
  | 'aviation-safety-sensitive'

export interface AppendEventInput {
  /** Stream identifier — typically the aggregate id (e.g. tail number, edge node id). */
  streamId: string
  /** Stream type, e.g. "aircraft", "edge_node", "content_pack", "prefetch_policy". */
  streamType: string
  /** Fully-qualified event type, e.g. "aero.edge_node.registered.v1". */
  eventType: string
  /** The event payload. MUST be JSON-serialisable. */
  payload: Record<string, unknown>
  /** Classification of the payload. Drives retention + access rules. */
  classification: EventClassification
  /** Authenticated actor (subject) making the change. */
  actorSub: string
  /** Organisation scope (multi-entity). */
  orgId: string
  /** Optional correlation id, for tracing across services. */
  correlationId?: string
  /** Optional causation id, pointing to the event that caused this one. */
  causationId?: string
}

export interface StoredEvent {
  id: string
  stream_id: string
  stream_type: string
  stream_seq: number
  event_type: string
  payload: Record<string, unknown>
  classification: EventClassification
  actor_sub: string
  org_id: string
  correlation_id: string | null
  causation_id: string | null
  prev_hash: string
  this_hash: string
  recorded_at: string
}

/**
 * Canonical JSON — stable key order, no extra whitespace. The hash chain
 * is only reproducible if every producer and verifier agrees on the byte
 * representation of the payload. RFC 8785 is the long-term target; this
 * implementation is a practical subset that rejects non-deterministic
 * constructs (undefined, functions, NaN, Infinity, Symbol).
 */
export function canonicalJson(value: unknown): string {
  if (value === null) return 'null'
  const t = typeof value
  if (t === 'number') {
    if (!Number.isFinite(value as number)) {
      throw new Error('canonicalJson: non-finite number is not permitted')
    }
    return JSON.stringify(value)
  }
  if (t === 'string' || t === 'boolean') return JSON.stringify(value)
  if (t === 'undefined' || t === 'function' || t === 'symbol') {
    throw new Error(`canonicalJson: unsupported type ${t}`)
  }
  if (Array.isArray(value)) {
    return '[' + value.map(canonicalJson).join(',') + ']'
  }
  if (t === 'object') {
    const obj = value as Record<string, unknown>
    const keys = Object.keys(obj).sort()
    return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonicalJson(obj[k])).join(',') + '}'
  }
  throw new Error(`canonicalJson: unhandled value`)
}

export function hashEvent(prevHash: string, input: AppendEventInput, recordedAt: string, streamSeq: number): string {
  const canonical = canonicalJson({
    stream_id: input.streamId,
    stream_type: input.streamType,
    stream_seq: streamSeq,
    event_type: input.eventType,
    payload: input.payload,
    classification: input.classification,
    actor_sub: input.actorSub,
    org_id: input.orgId,
    correlation_id: input.correlationId ?? null,
    causation_id: input.causationId ?? null,
    recorded_at: recordedAt,
  })
  const h = createHash('sha256')
  h.update(prevHash, 'hex')
  h.update('|')
  h.update(canonical, 'utf8')
  return h.digest('hex')
}

/**
 * Append an event to its stream, atomically extending the hash chain.
 *
 * Concurrency: we SELECT ... FOR UPDATE on the latest row of the stream
 * inside a transaction. Two concurrent appends to the same stream are
 * serialised by Postgres; the second one waits, reads the updated tip,
 * and chains onto it. Appends across different streams run in parallel.
 */
export async function appendEvent(input: AppendEventInput): Promise<StoredEvent> {
  return withTransaction(async (client) => {
    const tip = await client.query<{ stream_seq: number; this_hash: string }>(
      `SELECT stream_seq, this_hash
         FROM aero_event_log
        WHERE stream_id = $1 AND stream_type = $2
        ORDER BY stream_seq DESC
        LIMIT 1
        FOR UPDATE`,
      [input.streamId, input.streamType],
    )

    const prevSeq = tip.rowCount && tip.rowCount > 0 ? tip.rows[0].stream_seq : 0
    const prevHash = tip.rowCount && tip.rowCount > 0 ? tip.rows[0].this_hash : ZERO_HASH
    const streamSeq = prevSeq + 1

    // UTC, monotonic-safe timestamp. Postgres CURRENT_TIMESTAMP would also
    // work but we want the same string the hash was computed over.
    const recordedAt = new Date().toISOString()
    const thisHash = hashEvent(prevHash, input, recordedAt, streamSeq)
    const id = randomUUID()

    const insert = await client.query<StoredEvent>(
      `INSERT INTO aero_event_log (
          id, stream_id, stream_type, stream_seq, event_type, payload,
          classification, actor_sub, org_id, correlation_id, causation_id,
          prev_hash, this_hash, recorded_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
        RETURNING *`,
      [
        id,
        input.streamId,
        input.streamType,
        streamSeq,
        input.eventType,
        JSON.stringify(input.payload),
        input.classification,
        input.actorSub,
        input.orgId,
        input.correlationId ?? null,
        input.causationId ?? null,
        prevHash,
        thisHash,
        recordedAt,
      ],
    )

    return insert.rows[0]
  })
}

/**
 * Read a stream in order. Used by projectors and the audit viewer.
 */
export async function readStream(streamType: string, streamId: string): Promise<StoredEvent[]> {
  const { rows } = await getPool().query<StoredEvent>(
    `SELECT *
       FROM aero_event_log
      WHERE stream_type = $1 AND stream_id = $2
      ORDER BY stream_seq ASC`,
    [streamType, streamId],
  )
  return rows
}

/**
 * Walk a stream and verify the hash chain is intact.
 * Returns null if the chain is clean, or the stream_seq of the first break.
 *
 * This is called on boot and on a cron. If it returns non-null, the service
 * trips its circuit breaker into READ-ONLY mode and pages the on-call QA.
 */
export async function verifyChain(streamType: string, streamId: string): Promise<number | null> {
  const events = await readStream(streamType, streamId)
  let prev = ZERO_HASH
  for (const ev of events) {
    if (ev.prev_hash !== prev) return ev.stream_seq
    const expected = hashEvent(
      prev,
      {
        streamId: ev.stream_id,
        streamType: ev.stream_type,
        eventType: ev.event_type,
        payload: ev.payload,
        classification: ev.classification,
        actorSub: ev.actor_sub,
        orgId: ev.org_id,
        correlationId: ev.correlation_id ?? undefined,
        causationId: ev.causation_id ?? undefined,
      },
      ev.recorded_at,
      ev.stream_seq,
    )
    if (expected !== ev.this_hash) return ev.stream_seq
    prev = ev.this_hash
  }
  return null
}

/**
 * Verify every stream of a given type. Intended for the nightly evidence
 * collector that feeds the QMS continuous compliance dashboard.
 */
export async function verifyAllStreams(streamType: string): Promise<Array<{ streamId: string; brokenAt: number }>> {
  const { rows } = await getPool().query<{ stream_id: string }>(
    `SELECT DISTINCT stream_id FROM aero_event_log WHERE stream_type = $1`,
    [streamType],
  )
  const breaks: Array<{ streamId: string; brokenAt: number }> = []
  for (const r of rows) {
    const b = await verifyChain(streamType, r.stream_id)
    if (b !== null) breaks.push({ streamId: r.stream_id, brokenAt: b })
  }
  return breaks
}

/**
 * For tests. Never call from production code — it bypasses the transaction
 * guard and is only useful when seeding fixtures.
 */
export async function _appendEventWithClient(
  client: PoolClient,
  input: AppendEventInput,
): Promise<StoredEvent> {
  const tip = await client.query<{ stream_seq: number; this_hash: string }>(
    `SELECT stream_seq, this_hash FROM aero_event_log
      WHERE stream_id = $1 AND stream_type = $2
      ORDER BY stream_seq DESC LIMIT 1`,
    [input.streamId, input.streamType],
  )
  const prevSeq = tip.rowCount && tip.rowCount > 0 ? tip.rows[0].stream_seq : 0
  const prevHash = tip.rowCount && tip.rowCount > 0 ? tip.rows[0].this_hash : ZERO_HASH
  const streamSeq = prevSeq + 1
  const recordedAt = new Date().toISOString()
  const thisHash = hashEvent(prevHash, input, recordedAt, streamSeq)
  const id = randomUUID()
  const { rows } = await client.query<StoredEvent>(
    `INSERT INTO aero_event_log (
        id, stream_id, stream_type, stream_seq, event_type, payload,
        classification, actor_sub, org_id, correlation_id, causation_id,
        prev_hash, this_hash, recorded_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      RETURNING *`,
    [
      id,
      input.streamId,
      input.streamType,
      streamSeq,
      input.eventType,
      JSON.stringify(input.payload),
      input.classification,
      input.actorSub,
      input.orgId,
      input.correlationId ?? null,
      input.causationId ?? null,
      prevHash,
      thisHash,
      recordedAt,
    ],
  )
  return rows[0]
}
