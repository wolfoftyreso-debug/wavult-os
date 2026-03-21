import { Router, Request, Response } from "express";
import { supabase } from "./supabase";

// ---------------------------------------------------------------------------
// Event Types
// ---------------------------------------------------------------------------

const EVENT_TYPES = [
  "task.created",
  "task.completed",
  "task.status_changed",
  "deal.created",
  "deal.won",
  "deal.lost",
  "deal.status_changed",
  "nc.raised",
  "nc.closed",
  "nc.status_changed",
  "capability.assessed",
  "capability.gap_detected",
  "journal.posted",
  "improvement.created",
  "improvement.approved",
  "improvement.status_changed",
  "document.created",
  "document.review_due",
  "payout.created",
  "payout.approved",
  "contact.created",
  "lead.created",
  "company.created",
  "process.executed",
  "process.completed",
  "risk.created",
  "risk.level_changed",
  "goal.created",
  "goal.readiness_changed",
  "decision.created",
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

// ---------------------------------------------------------------------------
// DomainEvent
// ---------------------------------------------------------------------------

export interface DomainEvent {
  id?: string;
  org_id: string;
  event_type: EventType;
  entity_id?: string;
  entity_type: string;
  source_id: string;
  actor_id?: string;
  payload: Record<string, unknown>;
  emitted_at?: string;
}

// ---------------------------------------------------------------------------
// Handler type
// ---------------------------------------------------------------------------

type EventHandler = (event: DomainEvent) => void | Promise<void>;

// ---------------------------------------------------------------------------
// EventBus
// ---------------------------------------------------------------------------

export class EventBus {
  private subscribers: Map<string, EventHandler[]> = new Map();

  /**
   * Emit a domain event.
   * 1. Persist to the `domain_events` table.
   * 2. Notify all matching subscribers synchronously.
   * 3. Log the emission.
   */
  async emit(event: DomainEvent): Promise<void> {
    const record = {
      org_id: event.org_id,
      event_type: event.event_type,
      entity_id: event.entity_id ?? null,
      entity_type: event.entity_type,
      source_id: event.source_id,
      actor_id: event.actor_id ?? null,
      payload: event.payload,
      emitted_at: event.emitted_at ?? new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("domain_events")
      .insert(record)
      .select("id")
      .single();

    if (error) {
      console.error("[EventBus] Failed to persist event:", error.message);
      throw error;
    }

    const saved: DomainEvent = {
      ...event,
      id: data.id,
      emitted_at: record.emitted_at,
    };

    // Notify subscribers
    await this.notifySubscribers(saved);

    console.log(
      `[EventBus] ${saved.event_type} emitted (id=${saved.id}, entity=${saved.entity_type}/${saved.source_id})`
    );
  }

  /**
   * Register a handler for one or more event types.
   * Supports wildcard patterns such as `"deal.*"`.
   */
  on(eventType: string | string[], handler: EventHandler): void {
    const types = Array.isArray(eventType) ? eventType : [eventType];
    for (const t of types) {
      const handlers = this.subscribers.get(t) ?? [];
      handlers.push(handler);
      this.subscribers.set(t, handlers);
    }
  }

  /**
   * Query persisted domain events with optional filters.
   */
  async getEvents(filters: {
    org_id?: string;
    event_type?: string;
    entity_id?: string;
    since?: string;
    limit?: number;
  }): Promise<DomainEvent[]> {
    let query = supabase
      .from("domain_events")
      .select("*")
      .order("emitted_at", { ascending: false });

    if (filters.org_id) {
      query = query.eq("org_id", filters.org_id);
    }
    if (filters.event_type) {
      query = query.eq("event_type", filters.event_type);
    }
    if (filters.entity_id) {
      query = query.eq("entity_id", filters.entity_id);
    }
    if (filters.since) {
      query = query.gte("emitted_at", filters.since);
    }

    query = query.limit(filters.limit ?? 50);

    const { data, error } = await query;

    if (error) {
      console.error("[EventBus] Failed to query events:", error.message);
      throw error;
    }

    return (data ?? []) as DomainEvent[];
  }

  /**
   * Mark an event as processed by setting `processed_at`.
   */
  async markProcessed(eventId: string): Promise<void> {
    const { error } = await supabase
      .from("domain_events")
      .update({ processed_at: new Date().toISOString() })
      .eq("id", eventId);

    if (error) {
      console.error("[EventBus] Failed to mark event processed:", error.message);
      throw error;
    }
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  private async notifySubscribers(event: DomainEvent): Promise<void> {
    for (const [pattern, handlers] of this.subscribers.entries()) {
      if (this.matchesPattern(event.event_type, pattern)) {
        for (const handler of handlers) {
          try {
            await handler(event);
          } catch (err) {
            console.error(
              `[EventBus] Subscriber error for ${pattern}:`,
              err
            );
          }
        }
      }
    }
  }

  private matchesPattern(eventType: string, pattern: string): boolean {
    if (pattern === "*") return true;
    if (pattern === eventType) return true;

    // Wildcard: "deal.*" matches "deal.created", "deal.won", etc.
    if (pattern.endsWith(".*")) {
      const prefix = pattern.slice(0, -2);
      return eventType.startsWith(prefix + ".");
    }

    return false;
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

export const eventBus = new EventBus();

// ---------------------------------------------------------------------------
// Helper: emitEntityEvent
// ---------------------------------------------------------------------------

/**
 * Resolve the canonical `entity_id` from the `entities` table (by
 * `source_table` + `source_id`) and emit through the global event bus.
 */
export async function emitEntityEvent(
  eventType: EventType,
  entityType: string,
  sourceId: string,
  orgId: string,
  actorId: string | undefined,
  payload: Record<string, unknown>
): Promise<void> {
  let entityId: string | undefined;

  const { data } = await supabase
    .from("entities")
    .select("id")
    .eq("source_table", entityType)
    .eq("source_id", sourceId)
    .maybeSingle();

  if (data) {
    entityId = data.id;
  }

  await eventBus.emit({
    org_id: orgId,
    event_type: eventType,
    entity_id: entityId,
    entity_type: entityType,
    source_id: sourceId,
    actor_id: actorId,
    payload,
  });
}

// ---------------------------------------------------------------------------
// Express Router
// ---------------------------------------------------------------------------

export const eventsRouter = Router();

/**
 * GET /api/events
 * Query domain events with optional filters.
 */
eventsRouter.get("/", async (req: Request, res: Response) => {
  try {
    const { event_type, entity_id, since, limit, org_id } = req.query;

    const events = await eventBus.getEvents({
      org_id: org_id as string | undefined,
      event_type: event_type as string | undefined,
      entity_id: entity_id as string | undefined,
      since: since as string | undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });

    res.json(events);
  } catch (err: any) {
    console.error("[events] GET /api/events error:", err);
    res.status(500).json({ error: err.message ?? "Internal server error" });
  }
});

/**
 * GET /api/events/stream
 * Server-Sent Events endpoint for real-time event streaming.
 */
eventsRouter.get("/stream", (req: Request, res: Response) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  res.write(":\n\n"); // SSE comment to establish connection

  const handler: EventHandler = (event: DomainEvent) => {
    const data = JSON.stringify(event);
    res.write(`event: ${event.event_type}\ndata: ${data}\n\n`);
  };

  // Subscribe to all events for this stream
  eventBus.on("*", handler);

  // Clean up when the client disconnects
  req.on("close", () => {
    const handlers = (eventBus as any).subscribers.get("*") as
      | EventHandler[]
      | undefined;
    if (handlers) {
      const idx = handlers.indexOf(handler);
      if (idx !== -1) handlers.splice(idx, 1);
    }
  });
});
