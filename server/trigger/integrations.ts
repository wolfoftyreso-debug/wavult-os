import { schedules } from "@trigger.dev/sdk/v3";
import { supabase } from "../src/supabase";

// ---------------------------------------------------------------------------
// 1. Queue Processor — Every 5 minutes
// ---------------------------------------------------------------------------
export const queueProcessor = schedules.task({
  id: "integrations-queue-processor",
  cron: "*/5 * * * *",
  run: async () => {
    const now = new Date();
    const nowISO = now.toISOString();
    const results = { processed: 0, sent: 0, failed: 0, deadLettered: 0 };

    const { data: pendingItems, error } = await supabase
      .from("integration_queue")
      .select("id, connector_id, payload, attempts, max_attempts, entity_type, entity_id")
      .eq("status", "PENDING")
      .order("created_at", { ascending: true });

    if (error) throw new Error(`queueProcessor: ${error.message}`);

    for (const item of pendingItems ?? []) {
      results.processed++;

      // Mark as PROCESSING
      await supabase
        .from("integration_queue")
        .update({ status: "PROCESSING", updated_at: nowISO })
        .eq("id", item.id);

      // Fetch connector config
      const { data: connector } = await supabase
        .from("connectors")
        .select("id, type, config, endpoint_url")
        .eq("id", item.connector_id)
        .single();

      if (!connector) {
        await supabase
          .from("integration_queue")
          .update({ status: "FAILED", updated_at: nowISO })
          .eq("id", item.id);
        results.failed++;
        continue;
      }

      try {
        // Attempt to send via connector
        const response = await fetch(connector.endpoint_url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(connector.config?.auth_header ? { Authorization: connector.config.auth_header } : {}),
          },
          body: JSON.stringify(item.payload),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }

        // Success
        await supabase
          .from("integration_queue")
          .update({ status: "SENT", processed_at: nowISO, updated_at: nowISO })
          .eq("id", item.id);

        await supabase.from("integration_sync_log").insert({
          connector_id: item.connector_id,
          entity_type: item.entity_type,
          entity_id: item.entity_id,
          direction: "OUTBOUND",
          status: "SUCCESS",
          details: { queue_item_id: item.id },
          created_at: nowISO,
        });

        // Update connector last_sync_at
        await supabase
          .from("connectors")
          .update({ last_sync_at: nowISO, updated_at: nowISO })
          .eq("id", item.connector_id);

        results.sent++;
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        const newAttempts = (item.attempts ?? 0) + 1;
        const maxAttempts = item.max_attempts ?? 5;

        if (newAttempts >= maxAttempts) {
          // Dead letter
          await supabase
            .from("integration_queue")
            .update({
              status: "DEAD_LETTER",
              attempts: newAttempts,
              last_error: errorMessage,
              updated_at: nowISO,
            })
            .eq("id", item.id);

          results.deadLettered++;
        } else {
          // Retry with exponential backoff: 2^attempts minutes
          const backoffMinutes = Math.pow(2, newAttempts);
          const nextRetryAt = new Date(now.getTime() + backoffMinutes * 60 * 1000).toISOString();

          await supabase
            .from("integration_queue")
            .update({
              status: "FAILED",
              attempts: newAttempts,
              last_error: errorMessage,
              next_retry_at: nextRetryAt,
              updated_at: nowISO,
            })
            .eq("id", item.id);

          results.failed++;
        }
      }
    }

    return results;
  },
});

// ---------------------------------------------------------------------------
// 2. Health Check — Every 15 minutes
// ---------------------------------------------------------------------------
export const healthCheck = schedules.task({
  id: "integrations-health-check",
  cron: "*/15 * * * *",
  run: async () => {
    const now = new Date();
    const nowISO = now.toISOString();
    const results = { checked: 0, healthy: 0, errored: 0, paused: 0, recovered: 0 };

    const { data: connectors, error } = await supabase
      .from("connectors")
      .select("id, name, endpoint_url, config, status, error_count, org_id")
      .eq("status", "ACTIVE");

    if (error) throw new Error(`healthCheck: ${error.message}`);

    for (const connector of connectors ?? []) {
      results.checked++;

      try {
        const response = await fetch(connector.endpoint_url, {
          method: "GET",
          headers: {
            ...(connector.config?.auth_header ? { Authorization: connector.config.auth_header } : {}),
          },
          signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        // Connection succeeded
        if ((connector.error_count ?? 0) > 0) {
          // Recovery — was previously errored
          await supabase
            .from("connectors")
            .update({ error_count: 0, updated_at: nowISO })
            .eq("id", connector.id);

          await supabase.from("integration_sync_log").insert({
            connector_id: connector.id,
            direction: "HEALTH_CHECK",
            status: "RECOVERED",
            details: { previous_error_count: connector.error_count },
            created_at: nowISO,
          });

          results.recovered++;
        }

        results.healthy++;
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        const newErrorCount = (connector.error_count ?? 0) + 1;

        if (newErrorCount >= 3) {
          // Pause connector and alert admin
          await supabase
            .from("connectors")
            .update({ status: "PAUSED", error_count: newErrorCount, updated_at: nowISO })
            .eq("id", connector.id);

          await supabase.from("tasks").insert({
            type: "connector_health_alert",
            title: `ERP-koppling "${connector.name}" pausad efter ${newErrorCount} fel`,
            description: `Senaste fel: ${errorMessage}`,
            assigned_to_role: "ORG_ADMIN",
            org_id: connector.org_id,
            entity_type: "connector",
            entity_id: connector.id,
            priority: "critical",
            status: "pending",
            created_at: nowISO,
          });

          results.paused++;
        } else {
          await supabase
            .from("connectors")
            .update({ error_count: newErrorCount, updated_at: nowISO })
            .eq("id", connector.id);
        }

        results.errored++;
      }
    }

    return results;
  },
});

// ---------------------------------------------------------------------------
// 3. Incremental Sync — Daily 02:00
// ---------------------------------------------------------------------------
export const incrementalSync = schedules.task({
  id: "integrations-incremental-sync",
  cron: "0 2 * * *",
  run: async () => {
    const now = new Date();
    const nowISO = now.toISOString();
    const results = { connectors: 0, created: 0, updated: 0, errors: 0 };

    const { data: connectors, error } = await supabase
      .from("connectors")
      .select("id, name, endpoint_url, config, last_sync_at, org_id, sync_entity_types")
      .eq("status", "ACTIVE")
      .in("sync_direction", ["INBOUND", "BIDIRECTIONAL"]);

    if (error) throw new Error(`incrementalSync: ${error.message}`);

    for (const connector of connectors ?? []) {
      results.connectors++;
      const sinceDate = connector.last_sync_at ?? new Date(0).toISOString();

      try {
        // Fetch changed entities from external system
        const response = await fetch(
          `${connector.endpoint_url}/changes?since=${encodeURIComponent(sinceDate)}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              ...(connector.config?.auth_header ? { Authorization: connector.config.auth_header } : {}),
            },
            signal: AbortSignal.timeout(30000),
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }

        const changedEntities = await response.json() as Array<{
          external_id: string;
          entity_type: string;
          data: Record<string, unknown>;
        }>;

        for (const entity of changedEntities) {
          try {
            // Check for existing mapping
            const { data: existingRef } = await supabase
              .from("external_references")
              .select("id, internal_entity_id")
              .eq("connector_id", connector.id)
              .eq("external_id", entity.external_id)
              .eq("entity_type", entity.entity_type)
              .single();

            if (existingRef) {
              // Update existing Certified entity
              await supabase
                .from(entity.entity_type)
                .update({ ...entity.data, updated_at: nowISO })
                .eq("id", existingRef.internal_entity_id);

              await supabase.from("integration_sync_log").insert({
                connector_id: connector.id,
                entity_type: entity.entity_type,
                entity_id: existingRef.internal_entity_id,
                direction: "INBOUND",
                status: "UPDATED",
                details: { external_id: entity.external_id },
                created_at: nowISO,
              });

              results.updated++;
            } else {
              // Create new Certified entity
              const { data: newEntity } = await supabase
                .from(entity.entity_type)
                .insert({ ...entity.data, org_id: connector.org_id, created_at: nowISO, updated_at: nowISO })
                .select("id")
                .single();

              if (newEntity) {
                // Create external reference mapping
                await supabase.from("external_references").insert({
                  connector_id: connector.id,
                  external_id: entity.external_id,
                  entity_type: entity.entity_type,
                  internal_entity_id: newEntity.id,
                  created_at: nowISO,
                });

                await supabase.from("integration_sync_log").insert({
                  connector_id: connector.id,
                  entity_type: entity.entity_type,
                  entity_id: newEntity.id,
                  direction: "INBOUND",
                  status: "CREATED",
                  details: { external_id: entity.external_id },
                  created_at: nowISO,
                });

                results.created++;
              }
            }
          } catch (entityErr: unknown) {
            const msg = entityErr instanceof Error ? entityErr.message : String(entityErr);

            await supabase.from("integration_sync_log").insert({
              connector_id: connector.id,
              entity_type: entity.entity_type,
              direction: "INBOUND",
              status: "ERROR",
              details: { external_id: entity.external_id, error: msg },
              created_at: nowISO,
            });

            results.errors++;
          }
        }

        // Update connector last_sync_at
        await supabase
          .from("connectors")
          .update({ last_sync_at: nowISO, updated_at: nowISO })
          .eq("id", connector.id);
      } catch (connErr: unknown) {
        const msg = connErr instanceof Error ? connErr.message : String(connErr);

        await supabase.from("integration_sync_log").insert({
          connector_id: connector.id,
          direction: "INBOUND",
          status: "ERROR",
          details: { error: msg },
          created_at: nowISO,
        });

        results.errors++;
      }
    }

    return results;
  },
});

// ---------------------------------------------------------------------------
// 4. Integration Report — Weekly Monday 08:00
// ---------------------------------------------------------------------------
export const integrationReport = schedules.task({
  id: "integrations-weekly-report",
  cron: "0 8 * * 1",
  run: async () => {
    const now = new Date();
    const nowISO = now.toISOString();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const results = { orgsReported: 0 };

    // Get all orgs with active connectors
    const { data: connectors, error } = await supabase
      .from("connectors")
      .select("id, org_id, name")
      .eq("status", "ACTIVE");

    if (error) throw new Error(`integrationReport: ${error.message}`);

    // Group connectors by org
    const orgMap = new Map<string, Array<{ id: string; name: string }>>();
    for (const c of connectors ?? []) {
      const list = orgMap.get(c.org_id) ?? [];
      list.push({ id: c.id, name: c.name });
      orgMap.set(c.org_id, list);
    }

    for (const [orgId, orgConnectors] of Array.from(orgMap.entries())) {
      const connectorIds = orgConnectors.map((c) => c.id);

      // Fetch sync logs for the week
      const { data: logs } = await supabase
        .from("integration_sync_log")
        .select("id, status, created_at")
        .in("connector_id", connectorIds)
        .gte("created_at", weekAgo);

      const totalSyncs = logs?.length ?? 0;
      const successCount = (logs ?? []).filter((l) => ["SUCCESS", "CREATED", "UPDATED"].includes(l.status)).length;
      const errorCount = (logs ?? []).filter((l) => l.status === "ERROR").length;
      const successRate = totalSyncs > 0 ? Math.round((successCount / totalSyncs) * 100) : 0;

      // Dead letters this week
      const { data: deadLetters } = await supabase
        .from("integration_queue")
        .select("id")
        .in("connector_id", connectorIds)
        .eq("status", "DEAD_LETTER")
        .gte("updated_at", weekAgo);

      // Average latency (time between created_at and processed_at for SENT items)
      const { data: sentItems } = await supabase
        .from("integration_queue")
        .select("created_at, processed_at")
        .in("connector_id", connectorIds)
        .eq("status", "SENT")
        .gte("processed_at", weekAgo)
        .not("processed_at", "is", null);

      let avgLatencyMs = 0;
      if (sentItems && sentItems.length > 0) {
        const totalLatency = sentItems.reduce((sum, item) => {
          return sum + (new Date(item.processed_at).getTime() - new Date(item.created_at).getTime());
        }, 0);
        avgLatencyMs = Math.round(totalLatency / sentItems.length);
      }

      const avgLatencySeconds = Math.round(avgLatencyMs / 1000);

      const stats = {
        period_start: weekAgo,
        period_end: nowISO,
        connectors: orgConnectors.map((c) => c.name),
        total_syncs: totalSyncs,
        success_rate: `${successRate}%`,
        errors: errorCount,
        dead_letters: deadLetters?.length ?? 0,
        avg_latency_seconds: avgLatencySeconds,
      };

      await supabase.from("tasks").insert({
        type: "integration_weekly_report",
        title: "ERP-integration veckorapport",
        assigned_to_role: "ORG_ADMIN",
        org_id: orgId,
        entity_type: "report",
        priority: "medium",
        status: "pending",
        metadata: stats,
        created_at: nowISO,
      });

      results.orgsReported++;
    }

    return results;
  },
});

// ---------------------------------------------------------------------------
// 5. Dead Letter Cleanup — Daily 06:00
// ---------------------------------------------------------------------------
export const deadLetterCleanup = schedules.task({
  id: "integrations-dead-letter-cleanup",
  cron: "0 6 * * *",
  run: async () => {
    const now = new Date();
    const nowISO = now.toISOString();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const results = { archived: 0, deleted: 0 };

    const { data: staleItems, error } = await supabase
      .from("integration_queue")
      .select("id, connector_id, entity_type, entity_id, payload, attempts, last_error, created_at")
      .eq("status", "DEAD_LETTER")
      .lt("updated_at", thirtyDaysAgo);

    if (error) throw new Error(`deadLetterCleanup: ${error.message}`);

    for (const item of staleItems ?? []) {
      // Archive to sync log
      await supabase.from("integration_sync_log").insert({
        connector_id: item.connector_id,
        entity_type: item.entity_type,
        entity_id: item.entity_id,
        direction: "OUTBOUND",
        status: "SKIPPED",
        details: {
          queue_item_id: item.id,
          original_payload: item.payload,
          attempts: item.attempts,
          last_error: item.last_error,
          original_created_at: item.created_at,
          reason: "dead_letter_cleanup_30d",
        },
        created_at: nowISO,
      });

      results.archived++;

      // Delete from queue
      await supabase
        .from("integration_queue")
        .delete()
        .eq("id", item.id);

      results.deleted++;
    }

    return results;
  },
});
