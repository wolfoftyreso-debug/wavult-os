/**
 * classification — compile-time branded types for data classification.
 *
 * Aviation data is regulated at multiple levels of sensitivity. Getting
 * the wrong kind of data into the wrong code path (a log line, an API
 * response, an unencrypted S3 object) is an audit finding at best and a
 * safety-of-flight issue at worst.
 *
 * We enforce classification through brands. A value classified as
 * AviationSafetySensitive<T> cannot be passed to a function that accepts
 * Public<T>; TypeScript rejects the call at compile time.
 *
 * Brand levels (ascending sensitivity):
 *   Public                     Marketing copy, brochures
 *   Internal                   Release notes, internal dashboards
 *   Restricted                 PII, financial data
 *   AviationSafetySensitive    Airworthiness records, SMS reports,
 *                              threat-model findings, crew fatigue data
 *
 * Hierarchy: a function that accepts Public<T> MUST accept all higher
 * levels too — use `widen()` explicitly at the boundary, never implicit
 * casts.
 *
 * Requirements traceability:
 *   @req AEAN-REQ-AUD-003  Aviation-safety-sensitive events retained for lifetime of aircraft
 */

declare const PublicBrand: unique symbol
declare const InternalBrand: unique symbol
declare const RestrictedBrand: unique symbol
declare const AviationSafetySensitiveBrand: unique symbol

export type Public<T> = T & { readonly [PublicBrand]: 'public' }
export type Internal<T> = T & { readonly [InternalBrand]: 'internal' }
export type Restricted<T> = T & { readonly [RestrictedBrand]: 'restricted' }
export type AviationSafetySensitive<T> = T & { readonly [AviationSafetySensitiveBrand]: 'aviation-safety-sensitive' }

export type Classified<T> =
  | Public<T>
  | Internal<T>
  | Restricted<T>
  | AviationSafetySensitive<T>

export function classifyPublic<T>(v: T): Public<T> { return v as Public<T> }
export function classifyInternal<T>(v: T): Internal<T> { return v as Internal<T> }
export function classifyRestricted<T>(v: T): Restricted<T> { return v as Restricted<T> }
export function classifyAviationSafetySensitive<T>(v: T): AviationSafetySensitive<T> {
  return v as AviationSafetySensitive<T>
}

/**
 * Retention in days, per classification. Aligned with QMS-driven rules.
 * AviationSafetySensitive uses -1 to mean "lifetime of aircraft" — the
 * event log is never purged for this class; a lifecycle job moves old
 * rows to S3 Glacier Deep Archive but keeps hash-chain integrity.
 */
export const RETENTION_DAYS = {
  public: 365,
  internal: 365 * 3,
  restricted: 365 * 7,
  'aviation-safety-sensitive': -1,
} as const

/**
 * Serialiser that redacts anything above the caller's target classification
 * before it is written to a log or a response body. Use this at the
 * boundary, not in the middle of business logic.
 */
export function redactForAudience(
  value: Record<string, unknown>,
  audience: 'public' | 'internal' | 'restricted' | 'aviation-safety-sensitive',
  classification: 'public' | 'internal' | 'restricted' | 'aviation-safety-sensitive',
): Record<string, unknown> | '[REDACTED]' {
  const order = ['public', 'internal', 'restricted', 'aviation-safety-sensitive']
  if (order.indexOf(audience) < order.indexOf(classification)) return '[REDACTED]'
  return value
}
