/**
 * Generic inbound webhook handler.
 *
 * - Validates webhook signature (HMAC-SHA256)
 * - Parses payload using integration_mappings
 * - Creates/updates Certified entities based on mapping
 * - Logs to integration_sync_log
 * - Supports any system that can send webhooks
 */

import crypto from 'crypto';
import { applyMappings } from './connector';
import { supabase } from '../supabase';

export interface WebhookProcessingResult {
  accepted: boolean;
  entityType?: string;
  entityId?: string;
  error?: string;
}

export class GenericWebhookHandler {
  // ---------------------------------------------------------------------------
  // Signature validation
  // ---------------------------------------------------------------------------

  /**
   * Validates an HMAC-SHA256 webhook signature.
   *
   * Looks for the signature in these headers (in order):
   *   X-Hub-Signature-256, X-Webhook-Signature, X-Signature
   *
   * The expected format is either `sha256=<hex>` or plain `<hex>`.
   */
  static validateSignature(
    secret: string,
    headers: Record<string, string>,
    rawBody: string | Buffer,
  ): boolean {
    const sigHeader =
      headers['x-hub-signature-256'] ??
      headers['x-webhook-signature'] ??
      headers['x-signature'] ??
      '';

    if (!sigHeader) return false;

    const providedSig = sigHeader.startsWith('sha256=')
      ? sigHeader.slice(7)
      : sigHeader;

    const expected = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(providedSig, 'hex'),
      Buffer.from(expected, 'hex'),
    );
  }

  // ---------------------------------------------------------------------------
  // Process incoming webhook
  // ---------------------------------------------------------------------------

  /**
   * End-to-end processing of an inbound webhook payload.
   *
   * 1. Load the connector config & webhook secret from the database.
   * 2. Validate signature.
   * 3. Load integration_mappings for the connector.
   * 4. Map the payload to internal Certified entities.
   * 5. Upsert the entity via the appropriate table.
   * 6. Write an integration_sync_log entry.
   */
  static async process(
    connectorId: string,
    headers: Record<string, string>,
    rawBody: string,
    parsedBody: any,
  ): Promise<WebhookProcessingResult> {
    // 1. Load connector
    const { data: connector, error: connErr } = await supabase
      .from('integration_connectors')
      .select('*')
      .eq('id', connectorId)
      .single();

    if (connErr || !connector) {
      return { accepted: false, error: 'Connector not found' };
    }

    // 2. Validate signature
    const secret = connector.webhook_secret ?? connector.credentials?.webhook_secret;
    if (secret) {
      const valid = GenericWebhookHandler.validateSignature(secret, headers, rawBody);
      if (!valid) {
        await GenericWebhookHandler.logSync(connectorId, 'INBOUND', 'FAILED', 'Invalid webhook signature');
        return { accepted: false, error: 'Invalid signature' };
      }
    }

    // 3. Load mappings
    const { data: mappings } = await supabase
      .from('integration_mappings')
      .select('*')
      .eq('connector_id', connectorId)
      .eq('is_active', true);

    if (!mappings || mappings.length === 0) {
      await GenericWebhookHandler.logSync(connectorId, 'INBOUND', 'FAILED', 'No active mappings found');
      return { accepted: false, error: 'No mappings configured' };
    }

    // Determine the entity type from payload or first matching mapping
    const incomingEntityType =
      parsedBody.entityType ??
      parsedBody.entity_type ??
      parsedBody.type ??
      parsedBody.object ??
      'unknown';

    // Filter to the relevant mapping(s)
    const relevantMappings = mappings.filter(
      (m: any) =>
        m.entity_type === incomingEntityType ||
        m.external_entity_type === incomingEntityType,
    );

    if (relevantMappings.length === 0) {
      await GenericWebhookHandler.logSync(
        connectorId,
        'INBOUND',
        'SKIPPED',
        `No mapping for entity type: ${incomingEntityType}`,
      );
      return { accepted: false, error: `No mapping for entity type: ${incomingEntityType}` };
    }

    // 4. Apply mappings
    const targetMapping = relevantMappings[0];
    const payloadData = parsedBody.data ?? parsedBody;
    const mapped = applyMappings(payloadData, relevantMappings, 'INBOUND');

    // 5. Upsert entity
    try {
      const result = await GenericWebhookHandler.upsertEntity(
        targetMapping.entity_type,
        mapped,
        connectorId,
        connector.org_id,
      );

      await GenericWebhookHandler.logSync(
        connectorId,
        'INBOUND',
        'SUCCESS',
        undefined,
        targetMapping.entity_type,
        result.id,
      );

      return {
        accepted: true,
        entityType: targetMapping.entity_type,
        entityId: result.id,
      };
    } catch (err: any) {
      await GenericWebhookHandler.logSync(connectorId, 'INBOUND', 'FAILED', err.message);
      return { accepted: false, error: err.message };
    }
  }

  // ---------------------------------------------------------------------------
  // Entity upsert
  // ---------------------------------------------------------------------------

  private static async upsertEntity(
    entityType: string,
    data: Record<string, any>,
    connectorId: string,
    orgId: string,
  ): Promise<{ id: string }> {
    // Determine target table from entity type
    const tableMap: Record<string, string> = {
      nc: 'non_conformances',
      complaint: 'complaints',
      transaction: 'transactions',
      customer: 'customers',
      supplier: 'suppliers',
      product: 'products',
      order: 'orders',
      invoice: 'invoices',
    };

    const table = tableMap[entityType.toLowerCase()] ?? entityType.toLowerCase();

    const row = {
      ...data,
      org_id: orgId,
      integration_connector_id: connectorId,
      updated_at: new Date().toISOString(),
    };

    // Try upsert if we have an external ref, otherwise insert
    if (data.external_ref) {
      const { data: existing } = await supabase
        .from(table)
        .select('id')
        .eq('external_ref', data.external_ref)
        .eq('org_id', orgId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase.from(table).update(row).eq('id', existing.id);
        if (error) throw error;
        return { id: existing.id };
      }
    }

    const { data: inserted, error } = await supabase
      .from(table)
      .insert({ ...row, created_at: new Date().toISOString() })
      .select('id')
      .single();

    if (error) throw error;
    return { id: inserted.id };
  }

  // ---------------------------------------------------------------------------
  // Sync log
  // ---------------------------------------------------------------------------

  static async logSync(
    connectorId: string,
    direction: 'INBOUND' | 'OUTBOUND',
    status: 'SUCCESS' | 'FAILED' | 'SKIPPED',
    errorMessage?: string,
    entityType?: string,
    entityId?: string,
  ): Promise<void> {
    await supabase.from('integration_sync_log').insert({
      connector_id: connectorId,
      direction,
      status,
      entity_type: entityType ?? null,
      entity_id: entityId ?? null,
      error_message: errorMessage ?? null,
      synced_at: new Date().toISOString(),
    });
  }
}
