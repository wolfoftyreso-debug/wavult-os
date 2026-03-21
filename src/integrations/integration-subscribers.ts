/**
 * Event subscribers that push domain events to the ERP integration
 * outbound queue, and handle inbound webhook event processing.
 */

import { eventBus } from '../events';
import { supabase } from '../supabase';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Find active connectors for an org, optionally filtered by module.
 */
async function findActiveConnectors(orgId: string, module?: string) {
  let query = supabase
    .from('integration_connectors')
    .select('*')
    .eq('org_id', orgId)
    .eq('is_active', true);

  if (module) {
    query = query.contains('modules', [module]);
  }

  const { data } = await query;
  return data ?? [];
}

/**
 * Enqueue an outbound item for a connector.
 */
async function enqueueOutbound(
  connectorId: string,
  entityType: string,
  entityId: string,
  payload: Record<string, any>,
) {
  await supabase.from('integration_outbound_queue').insert({
    connector_id: connectorId,
    entity_type: entityType,
    entity_id: entityId,
    payload,
    status: 'PENDING',
    attempts: 0,
    created_at: new Date().toISOString(),
  });
}

// ---------------------------------------------------------------------------
// Outbound subscribers
// ---------------------------------------------------------------------------

function registerOutboundSubscribers() {
  /**
   * nc.closed → if connector modules includes 'PROCESS': queue outbound NC data
   */
  eventBus.on('nc.closed', async (event: any) => {
    const { orgId, ncId, data } = event;
    const connectors = await findActiveConnectors(orgId, 'PROCESS');
    for (const connector of connectors) {
      await enqueueOutbound(connector.id, 'NonConformance', ncId, {
        action: 'NC_CLOSED',
        nc_id: ncId,
        ...data,
      });
    }
  });

  /**
   * complaint.resolved + CREDIT → if FINANCIAL connector: queue credit note
   */
  eventBus.on('complaint.resolved', async (event: any) => {
    const { orgId, complaintId, resolution, data } = event;

    if (resolution !== 'CREDIT') return;

    const connectors = await findActiveConnectors(orgId, 'FINANCIAL');
    for (const connector of connectors) {
      await enqueueOutbound(connector.id, 'CreditNote', complaintId, {
        action: 'CREATE_CREDIT_NOTE',
        complaint_id: complaintId,
        ...data,
      });
    }
  });

  /**
   * recall.approved → if connector active: queue stock block
   */
  eventBus.on('recall.approved', async (event: any) => {
    const { orgId, recallId, data } = event;
    const connectors = await findActiveConnectors(orgId);
    for (const connector of connectors) {
      await enqueueOutbound(connector.id, 'StockBlock', recallId, {
        action: 'STOCK_BLOCK',
        recall_id: recallId,
        ...data,
      });
    }
  });

  /**
   * transaction.created → if FINANCIAL connector: queue voucher
   */
  eventBus.on('transaction.created', async (event: any) => {
    const { orgId, transactionId, data } = event;
    const connectors = await findActiveConnectors(orgId, 'FINANCIAL');
    for (const connector of connectors) {
      await enqueueOutbound(connector.id, 'Voucher', transactionId, {
        action: 'CREATE_VOUCHER',
        transaction_id: transactionId,
        ...data,
      });
    }
  });

  /**
   * deal.won → if connector active: queue new customer/order
   */
  eventBus.on('deal.won', async (event: any) => {
    const { orgId, dealId, customer, data } = event;
    const connectors = await findActiveConnectors(orgId);
    for (const connector of connectors) {
      // Queue customer creation
      if (customer) {
        await enqueueOutbound(connector.id, 'Customer', dealId, {
          action: 'CREATE_CUSTOMER',
          deal_id: dealId,
          ...customer,
        });
      }

      // Queue order creation
      await enqueueOutbound(connector.id, 'SalesOrder', dealId, {
        action: 'CREATE_ORDER',
        deal_id: dealId,
        ...data,
      });
    }
  });
}

// ---------------------------------------------------------------------------
// Inbound webhook event processing
// ---------------------------------------------------------------------------

function registerInboundSubscribers() {
  /**
   * delivery_deviation → nc.raised
   */
  eventBus.on('webhook.delivery_deviation', async (event: any) => {
    const { orgId, data, connectorId } = event;

    const ncPayload = {
      org_id: orgId,
      title: data.title ?? data.description ?? 'Delivery deviation',
      description: data.details ?? data.description ?? '',
      source: 'ERP_WEBHOOK',
      external_ref: data.external_id ?? data.id ?? null,
      integration_connector_id: connectorId,
      status: 'OPEN',
      created_at: new Date().toISOString(),
    };

    const { data: nc, error } = await supabase
      .from('non_conformances')
      .insert(ncPayload)
      .select('id')
      .single();

    if (!error && nc) {
      eventBus.emit({ org_id: orgId, event_type: 'nc.raised' as any, entity_type: 'non_conformances', source_id: nc.id, payload: { ncId: nc.id, data: ncPayload } });
    }
  });

  /**
   * customer_complaint → complaint.received
   */
  eventBus.on('webhook.customer_complaint', async (event: any) => {
    const { orgId, data, connectorId } = event;

    const complaintPayload = {
      org_id: orgId,
      title: data.title ?? data.subject ?? 'Customer complaint',
      description: data.description ?? data.details ?? '',
      customer_ref: data.customer_id ?? data.customer_ref ?? null,
      source: 'ERP_WEBHOOK',
      external_ref: data.external_id ?? data.id ?? null,
      integration_connector_id: connectorId,
      status: 'RECEIVED',
      created_at: new Date().toISOString(),
    };

    const { data: complaint, error } = await supabase
      .from('complaints')
      .insert(complaintPayload)
      .select('id')
      .single();

    if (!error && complaint) {
      eventBus.emit({ org_id: orgId, event_type: 'complaint.received' as any, entity_type: 'complaints', source_id: complaint.id, payload: { complaintId: complaint.id, data: complaintPayload } });
    }
  });

  /**
   * invoice_paid → transaction.created
   */
  eventBus.on('webhook.invoice_paid', async (event: any) => {
    const { orgId, data, connectorId } = event;

    const txPayload = {
      org_id: orgId,
      type: 'PAYMENT',
      amount: data.amount ?? data.total ?? 0,
      currency: data.currency ?? 'SEK',
      description: data.description ?? `Invoice ${data.invoice_number ?? data.external_id ?? ''} paid`,
      external_ref: data.external_id ?? data.invoice_number ?? null,
      integration_connector_id: connectorId,
      created_at: new Date().toISOString(),
    };

    const { data: tx, error } = await supabase
      .from('transactions')
      .insert(txPayload)
      .select('id')
      .single();

    if (!error && tx) {
      eventBus.emit({ org_id: orgId, event_type: 'transaction.created' as any, entity_type: 'transactions', source_id: tx.id, payload: { transactionId: tx.id, data: txPayload } });
    }
  });
}

// ---------------------------------------------------------------------------
// Public registration function
// ---------------------------------------------------------------------------

export function registerIntegrationSubscribers(): void {
  registerOutboundSubscribers();
  registerInboundSubscribers();
}
