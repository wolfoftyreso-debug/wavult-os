/**
 * Fortnox REST API v3 connector.
 *
 * Supports:
 *  - Auth: OAuth2 or legacy API key
 *  - Entities: Customers, Suppliers, Invoices, CreditInvoices, Articles, Vouchers
 *  - SIE4 import
 */

import type {
  ERPConnector,
  ExternalEntity,
  SyncResult,
  ConnectionHealth,
} from './connector';

const FORTNOX_API_BASE = 'https://api.fortnox.se/3';

const ENTITY_ENDPOINTS: Record<string, string> = {
  Customer: '/customers',
  Supplier: '/suppliers',
  Invoice: '/invoices',
  CreditInvoice: '/creditinvoices',
  Article: '/articles',
  Voucher: '/vouchers',
};

export class FortnoxConnector implements ERPConnector {
  id: string;
  systemType = 'FORTNOX';

  private baseUrl: string;
  private accessToken: string | null = null;
  private clientId: string;
  private clientSecret: string;
  private refreshTokenValue: string | null = null;
  private apiKey: string | null = null;
  private authMode: 'oauth2' | 'apikey';

  constructor(config: any) {
    this.id = config.id;
    this.baseUrl = config.base_url ?? FORTNOX_API_BASE;
    this.clientId = config.credentials?.client_id ?? '';
    this.clientSecret = config.credentials?.client_secret ?? '';
    this.refreshTokenValue = config.credentials?.refresh_token ?? null;
    this.apiKey = config.credentials?.api_key ?? null;
    this.accessToken = config.credentials?.access_token ?? null;
    this.authMode = this.apiKey ? 'apikey' : 'oauth2';
  }

  // ---------------------------------------------------------------------------
  // Auth
  // ---------------------------------------------------------------------------

  async authenticate(): Promise<boolean> {
    if (this.authMode === 'apikey') {
      // API-key auth — no handshake needed, just verify the key is present
      return !!this.apiKey;
    }

    // OAuth2 flow — exchange refresh token for a new access token
    try {
      const res = await fetch('https://apps.fortnox.se/oauth-v1/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: this.refreshTokenValue ?? '',
        }),
      });

      if (!res.ok) return false;

      const json: any = await res.json();
      this.accessToken = json.access_token;
      this.refreshTokenValue = json.refresh_token ?? this.refreshTokenValue;
      return true;
    } catch {
      return false;
    }
  }

  async refreshToken(): Promise<void> {
    const ok = await this.authenticate();
    if (!ok) throw new Error('Fortnox token refresh failed');
  }

  // ---------------------------------------------------------------------------
  // Fetch entities
  // ---------------------------------------------------------------------------

  async fetchEntities(entityType: string, since?: Date): Promise<ExternalEntity[]> {
    const endpoint = ENTITY_ENDPOINTS[entityType];
    if (!endpoint) throw new Error(`Unsupported Fortnox entity type: ${entityType}`);

    let url = `${this.baseUrl}${endpoint}`;
    if (since) {
      url += `?lastmodified=${since.toISOString().slice(0, 10)}`;
    }

    const res = await this.request('GET', url);
    const json: any = await res.json();

    // Fortnox wraps collections in a plural key, e.g. { "Customers": [...] }
    const collectionKey = Object.keys(json).find((k) => Array.isArray(json[k])) ?? entityType;
    const items: any[] = json[collectionKey] ?? [];

    return items.map((item: any) => ({
      externalId: String(item.CustomerNumber ?? item.SupplierNumber ?? item.DocumentNumber ?? item.ArticleNumber ?? item['@url'] ?? ''),
      entityType,
      data: item,
      updatedAt: item['@ModifiedUTC'] ?? undefined,
    }));
  }

  // ---------------------------------------------------------------------------
  // Push entity
  // ---------------------------------------------------------------------------

  async pushEntity(entityType: string, data: any): Promise<SyncResult> {
    const endpoint = ENTITY_ENDPOINTS[entityType];
    if (!endpoint) {
      return { externalId: '', success: false, error: `Unsupported entity type: ${entityType}` };
    }

    const url = `${this.baseUrl}${endpoint}`;
    const wrappedBody: Record<string, any> = { [entityType]: data };

    try {
      const res = await this.request('POST', url, wrappedBody);
      const json: any = await res.json();
      const created = json[entityType] ?? {};
      const externalId = String(
        created.CustomerNumber ?? created.SupplierNumber ?? created.DocumentNumber ?? created.ArticleNumber ?? '',
      );
      return { externalId, success: res.ok };
    } catch (err: any) {
      return { externalId: '', success: false, error: err.message };
    }
  }

  // ---------------------------------------------------------------------------
  // SIE4 import
  // ---------------------------------------------------------------------------

  async importSIE4(fileBuffer: Buffer, financialYear: number): Promise<SyncResult> {
    const url = `${this.baseUrl}/sie/${financialYear}`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          ...this.authHeaders(),
          'Content-Type': 'application/x-sie',
        },
        body: fileBuffer as unknown as BodyInit,
      });
      return { externalId: String(financialYear), success: res.ok };
    } catch (err: any) {
      return { externalId: '', success: false, error: err.message };
    }
  }

  // ---------------------------------------------------------------------------
  // Webhooks
  // ---------------------------------------------------------------------------

  validateWebhook(_headers: any, _body: any): boolean {
    // Fortnox webhooks do not provide signature verification by default.
    // Rely on the secret included in the registered webhook URL path.
    return true;
  }

  parseWebhookEvent(body: any): { eventType: string; entityType: string; data: any } {
    return {
      eventType: body.event ?? 'unknown',
      entityType: body.entityType ?? body.type ?? 'unknown',
      data: body.data ?? body,
    };
  }

  // ---------------------------------------------------------------------------
  // Health check
  // ---------------------------------------------------------------------------

  async testConnection(): Promise<ConnectionHealth> {
    const start = Date.now();
    try {
      const res = await this.request('GET', `${this.baseUrl}/companyinformation`);
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

  private authHeaders(): Record<string, string> {
    if (this.authMode === 'apikey') {
      return {
        'Access-Token': this.accessToken ?? '',
        'Client-Secret': this.apiKey ?? '',
        Accept: 'application/json',
      };
    }
    return {
      Authorization: `Bearer ${this.accessToken}`,
      Accept: 'application/json',
    };
  }

  private async request(method: string, url: string, body?: any): Promise<Response> {
    const headers: Record<string, string> = {
      ...this.authHeaders(),
    };
    if (body) {
      headers['Content-Type'] = 'application/json';
    }
    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    // Auto-refresh on 401
    if (res.status === 401 && this.authMode === 'oauth2') {
      await this.refreshToken();
      return fetch(url, {
        method,
        headers: { ...this.authHeaders(), ...(body ? { 'Content-Type': 'application/json' } : {}) },
        body: body ? JSON.stringify(body) : undefined,
      });
    }

    return res;
  }
}
