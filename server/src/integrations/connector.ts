/**
 * Base connector interface and framework for ERP integrations.
 */

export interface ExternalEntity {
  externalId: string;
  entityType: string;
  data: Record<string, any>;
  updatedAt?: string;
}

export interface SyncResult {
  externalId: string;
  success: boolean;
  error?: string;
}

export interface ConnectionHealth {
  connected: boolean;
  latency_ms: number;
  error?: string;
}

export interface ERPConnector {
  id: string;
  systemType: string;

  authenticate(): Promise<boolean>;
  refreshToken(): Promise<void>;

  fetchEntities(entityType: string, since?: Date): Promise<ExternalEntity[]>;
  pushEntity(entityType: string, data: any): Promise<SyncResult>;

  validateWebhook(headers: any, body: any): boolean;
  parseWebhookEvent(body: any): { eventType: string; entityType: string; data: any };

  testConnection(): Promise<ConnectionHealth>;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Returns the appropriate ERPConnector implementation based on
 * `config.system_type`.
 */
export function createConnector(config: any): ERPConnector {
  const systemType: string = (config.system_type ?? '').toUpperCase();

  switch (systemType) {
    case 'FORTNOX': {
      // Lazy import to avoid circular deps at module level
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { FortnoxConnector } = require('./fortnox');
      return new FortnoxConnector(config);
    }
    case 'SAP':
    case 'SAP_B1':
    case 'SAP_S4': {
      const { SAPConnector } = require('./sap');
      return new SAPConnector(config);
    }
    default:
      throw new Error(`Unsupported ERP system type: ${systemType}`);
  }
}

// ---------------------------------------------------------------------------
// Transform helpers
// ---------------------------------------------------------------------------

/**
 * Applies a single field-level transformation.
 *
 * Supported transform types:
 *  - map        — lookup value in a static map object
 *  - format     — simple template string (`"prefix-{value}"`)
 *  - convert    — type coercion (`number`, `string`, `boolean`, `date`)
 *  - concat     — join multiple fields with a separator
 *  - split      — split a string value by a delimiter and pick an index
 */
export function applyTransform(value: any, transform: any): any {
  if (!transform || !transform.type) return value;

  switch (transform.type) {
    case 'map': {
      const mapping: Record<string, any> = transform.map ?? {};
      return mapping[value] ?? transform.default ?? value;
    }

    case 'format': {
      const template: string = transform.template ?? '{value}';
      return template.replace(/\{value\}/g, String(value ?? ''));
    }

    case 'convert': {
      const target: string = transform.to ?? 'string';
      switch (target) {
        case 'number':
          return Number(value);
        case 'string':
          return String(value ?? '');
        case 'boolean':
          return Boolean(value);
        case 'date':
          return new Date(value).toISOString();
        default:
          return value;
      }
    }

    case 'concat': {
      const fields: string[] = transform.fields ?? [];
      const separator: string = transform.separator ?? ' ';
      const source: Record<string, any> = transform._source ?? {};
      return fields.map((f: string) => source[f] ?? '').join(separator);
    }

    case 'split': {
      const delimiter: string = transform.delimiter ?? ',';
      const index: number = transform.index ?? 0;
      const parts = String(value ?? '').split(delimiter);
      return parts[index] ?? '';
    }

    default:
      return value;
  }
}

/**
 * Applies an array of field mappings to a data record and returns the
 * mapped result.
 *
 * Each mapping is expected to have:
 *   - internal_field   (the Certified-side field name)
 *   - external_field   (the ERP-side field name)
 *   - direction        ('INBOUND' | 'OUTBOUND' | 'BOTH')
 *   - transform_rules  (optional – passed to `applyTransform`)
 */
export function applyMappings(
  data: Record<string, any>,
  mappings: any[],
  direction: 'INBOUND' | 'OUTBOUND',
): Record<string, any> {
  const result: Record<string, any> = {};

  for (const mapping of mappings) {
    const dir: string = mapping.direction ?? 'BOTH';
    if (dir !== 'BOTH' && dir !== direction) continue;

    let sourceField: string;
    let targetField: string;

    if (direction === 'INBOUND') {
      // ERP → Certified
      sourceField = mapping.external_field;
      targetField = mapping.internal_field;
    } else {
      // Certified → ERP
      sourceField = mapping.internal_field;
      targetField = mapping.external_field;
    }

    let value = data[sourceField];

    if (mapping.transform_rules) {
      const transformRules = typeof mapping.transform_rules === 'string'
        ? JSON.parse(mapping.transform_rules)
        : mapping.transform_rules;

      // Attach the full source record for concat transforms
      if (transformRules.type === 'concat') {
        transformRules._source = data;
      }

      value = applyTransform(value, transformRules);
    }

    if (value !== undefined) {
      result[targetField] = value;
    }
  }

  return result;
}
