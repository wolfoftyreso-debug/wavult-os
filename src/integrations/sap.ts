/**
 * SAP connector skeleton.
 *
 * Supports:
 *  - Auth: API_KEY or SAP_RFC
 *  - Entities: BusinessPartner, SalesOrder, PurchaseOrder, Item,
 *              CreditNote, QualityNotification
 *  - Quality Management: QualityNotification → NC mapping
 */

import type {
  ERPConnector,
  ExternalEntity,
  SyncResult,
  ConnectionHealth,
} from './connector';

const ENTITY_PATHS: Record<string, string> = {
  BusinessPartner: '/sap/opu/odata/sap/API_BUSINESS_PARTNER/A_BusinessPartner',
  SalesOrder: '/sap/opu/odata/sap/API_SALES_ORDER_SRV/A_SalesOrder',
  PurchaseOrder: '/sap/opu/odata/sap/API_PURCHASEORDER_PROCESS_SRV/A_PurchaseOrder',
  Item: '/sap/opu/odata/sap/API_PRODUCT_SRV/A_Product',
  CreditNote: '/sap/opu/odata/sap/API_CREDIT_MEMO_REQUEST_SRV/A_CreditMemoRequest',
  QualityNotification: '/sap/opu/odata/sap/API_QUALITYNOTIFICATION/A_QualityNotification',
};

export class SAPConnector implements ERPConnector {
  id: string;
  systemType = 'SAP';

  private baseUrl: string;
  private authMode: 'API_KEY' | 'SAP_RFC';
  private apiKey: string | null = null;
  private username: string | null = null;
  private password: string | null = null;
  private csrfToken: string | null = null;

  constructor(config: any) {
    this.id = config.id;
    this.baseUrl = config.base_url ?? '';
    this.authMode = config.credentials?.auth_mode ?? 'API_KEY';
    this.apiKey = config.credentials?.api_key ?? null;
    this.username = config.credentials?.username ?? null;
    this.password = config.credentials?.password ?? null;
  }

  // ---------------------------------------------------------------------------
  // Auth
  // ---------------------------------------------------------------------------

  async authenticate(): Promise<boolean> {
    if (this.authMode === 'API_KEY') {
      return !!this.apiKey;
    }

    // SAP_RFC / Basic — fetch a CSRF token
    try {
      const res = await fetch(`${this.baseUrl}/sap/opu/odata/sap/API_BUSINESS_PARTNER/`, {
        method: 'GET',
        headers: {
          ...this.basicAuthHeader(),
          'X-CSRF-Token': 'Fetch',
        },
      });

      if (!res.ok) return false;
      this.csrfToken = res.headers.get('x-csrf-token') ?? null;
      return true;
    } catch {
      return false;
    }
  }

  async refreshToken(): Promise<void> {
    const ok = await this.authenticate();
    if (!ok) throw new Error('SAP authentication refresh failed');
  }

  // ---------------------------------------------------------------------------
  // Fetch entities
  // ---------------------------------------------------------------------------

  async fetchEntities(entityType: string, since?: Date): Promise<ExternalEntity[]> {
    const path = ENTITY_PATHS[entityType];
    if (!path) throw new Error(`Unsupported SAP entity type: ${entityType}`);

    let url = `${this.baseUrl}${path}?$format=json`;
    if (since) {
      const isoFilter = since.toISOString().replace(/\.\d+Z$/, 'Z');
      url += `&$filter=LastChangeDateTime ge datetime'${isoFilter}'`;
    }

    const res = await this.request('GET', url);
    const json: any = await res.json();
    const results: any[] = json?.d?.results ?? [];

    return results.map((item: any) => ({
      externalId: String(
        item.BusinessPartner ??
        item.SalesOrder ??
        item.PurchaseOrder ??
        item.Product ??
        item.CreditMemoRequest ??
        item.QualityNotification ??
        '',
      ),
      entityType,
      data: item,
      updatedAt: item.LastChangeDateTime ?? item.ChangedOnDateTime ?? undefined,
    }));
  }

  // ---------------------------------------------------------------------------
  // Push entity
  // ---------------------------------------------------------------------------

  async pushEntity(entityType: string, data: any): Promise<SyncResult> {
    const path = ENTITY_PATHS[entityType];
    if (!path) {
      return { externalId: '', success: false, error: `Unsupported entity type: ${entityType}` };
    }

    const url = `${this.baseUrl}${path}`;

    try {
      const res = await this.request('POST', url, data);
      if (!res.ok) {
        const errBody = await res.text();
        return { externalId: '', success: false, error: `HTTP ${res.status}: ${errBody}` };
      }
      const json: any = await res.json();
      const created = json?.d ?? {};
      const externalId = String(
        created.BusinessPartner ??
        created.SalesOrder ??
        created.PurchaseOrder ??
        created.Product ??
        created.CreditMemoRequest ??
        created.QualityNotification ??
        '',
      );
      return { externalId, success: true };
    } catch (err: any) {
      return { externalId: '', success: false, error: err.message };
    }
  }

  // ---------------------------------------------------------------------------
  // Quality Management — QualityNotification → NC mapping
  // ---------------------------------------------------------------------------

  /**
   * Converts a SAP QualityNotification into the internal Non-Conformance
   * structure used by Certified.
   */
  mapQualityNotificationToNC(qn: any): Record<string, any> {
    return {
      title: qn.QualityNotificationText ?? qn.NotificationText ?? '',
      description: qn.NotificationLongText ?? '',
      severity: this.mapQNPriority(qn.QltyNotifctnPriority),
      source: 'SAP_QN',
      external_ref: String(qn.QualityNotification ?? ''),
      defect_type: qn.DefectCodeText ?? qn.DefectCode ?? '',
      reported_at: qn.CreationDate ?? new Date().toISOString(),
      status: qn.QualityNotifctnStatus === '90' ? 'CLOSED' : 'OPEN',
    };
  }

  private mapQNPriority(priority: string | undefined): string {
    switch (priority) {
      case '1': return 'CRITICAL';
      case '2': return 'HIGH';
      case '3': return 'MEDIUM';
      default: return 'LOW';
    }
  }

  // ---------------------------------------------------------------------------
  // Webhooks
  // ---------------------------------------------------------------------------

  validateWebhook(headers: any, _body: any): boolean {
    // SAP Event Mesh uses a shared secret in the Authorization header
    const authHeader: string = headers?.authorization ?? headers?.Authorization ?? '';
    if (!authHeader) return false;
    // Basic validation: presence of Bearer token
    return authHeader.startsWith('Bearer ') || authHeader.startsWith('Basic ');
  }

  parseWebhookEvent(body: any): { eventType: string; entityType: string; data: any } {
    return {
      eventType: body.event ?? body.type ?? 'unknown',
      entityType: body.entityType ?? body.objectType ?? 'unknown',
      data: body.data ?? body.payload ?? body,
    };
  }

  // ---------------------------------------------------------------------------
  // Health check
  // ---------------------------------------------------------------------------

  async testConnection(): Promise<ConnectionHealth> {
    const start = Date.now();
    try {
      const res = await this.request('GET', `${this.baseUrl}/sap/opu/odata/sap/API_BUSINESS_PARTNER/?$top=1&$format=json`);
      const latency = Date.now() - start;
      if (!res.ok) {
        return { connected: false, latency_ms: latency, error: `HTTP ${res.status}` };
      }
      return { connected: true, latency_ms: latency };
    } catch (err: any) {
      return { connected: false, latency_ms: Date.now() - start, error: err.message };
    }
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  private basicAuthHeader(): Record<string, string> {
    if (this.authMode === 'API_KEY') {
      return { APIKey: this.apiKey ?? '' };
    }
    const encoded = Buffer.from(`${this.username}:${this.password}`).toString('base64');
    return { Authorization: `Basic ${encoded}` };
  }

  private async request(method: string, url: string, body?: any): Promise<Response> {
    const headers: Record<string, string> = {
      ...this.basicAuthHeader(),
      Accept: 'application/json',
    };

    if (this.csrfToken && method !== 'GET') {
      headers['X-CSRF-Token'] = this.csrfToken;
    }

    if (body) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    // Re-fetch CSRF on 403
    if (res.status === 403 && method !== 'GET') {
      await this.authenticate();
      return fetch(url, {
        method,
        headers: {
          ...this.basicAuthHeader(),
          Accept: 'application/json',
          'X-CSRF-Token': this.csrfToken ?? '',
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
    }

    return res;
  }
}
