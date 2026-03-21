import { supabase } from "./supabase";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LocaleProfile {
  id: string;
  locale_code: string;         // e.g. 'sv-SE'
  language_code: string;       // e.g. 'sv'
  country_code: string;        // e.g. 'SE'
  label: string;               // e.g. 'Swedish (Sweden)'
  decimal_separator: string;   // ',' or '.'
  thousands_separator: string; // ' ', '.', or ','
  currency_symbol_before: boolean;
  currency_symbol_space: boolean;
  date_format: string;         // 'YYYY-MM-DD', 'MM/DD/YYYY', 'DD.MM.YYYY', etc.
  time_format: string;         // 'H24' or 'H12'
  first_day_of_week: number;   // 1 = Monday, 0 = Sunday
  measurement_system: string;  // 'METRIC' or 'IMPERIAL'
  temperature_unit: string;    // 'CELSIUS' or 'FAHRENHEIT'
  name_order: string;          // 'GIVEN_FAMILY' or 'FAMILY_GIVEN'
  address_format: string;      // template string with placeholders
  default_currency: string;    // 'SEK', 'USD', etc.
  vat_label: string;           // 'Moms', 'VAT', 'USt', 'TVA', etc.
  vat_rates: Record<string, number>; // { standard: 25, reduced: 12, super_reduced: 6 }
  percent_space: boolean;      // true => "85 %", false => "85%"
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LocaleContext {
  locale: string;      // 'sv-SE'
  language: string;    // 'sv'
  profile: LocaleProfile;
}

// ---------------------------------------------------------------------------
// Locale cache
// ---------------------------------------------------------------------------

const localeCache: Map<string, LocaleContext> = new Map();

export async function getLocale(localeCode: string): Promise<LocaleContext> {
  const cached = localeCache.get(localeCode);
  if (cached) return cached;

  const { data, error } = await supabase
    .from("locale_profiles")
    .select("*")
    .eq("locale_code", localeCode)
    .single();

  if (error || !data) {
    throw new Error(`Locale profile not found for "${localeCode}": ${error?.message}`);
  }

  const ctx: LocaleContext = {
    locale: data.locale_code,
    language: data.language_code,
    profile: data as LocaleProfile,
  };

  localeCache.set(localeCode, ctx);
  return ctx;
}

// ---------------------------------------------------------------------------
// Currency symbols & zero-decimal currencies
// ---------------------------------------------------------------------------

export const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: "\u20AC", USD: "$", SEK: "kr", GBP: "\u00A3", NOK: "kr", DKK: "kr",
  PLN: "z\u0142", CHF: "CHF", AED: "\u062F.\u0625", JPY: "\u00A5",
  CNY: "\u00A5", KRW: "\u20A9", THB: "\u0E3F", INR: "\u20B9",
  RUB: "\u20BD", CZK: "K\u010D", BRL: "R$",
};

export const ZERO_DECIMAL_CURRENCIES = ["JPY", "KRW", "VND", "HUF"];

// ---------------------------------------------------------------------------
// Month names
// ---------------------------------------------------------------------------

export const MONTH_NAMES: Record<string, string[]> = {
  sv: ["januari", "februari", "mars", "april", "maj", "juni",
       "juli", "augusti", "september", "oktober", "november", "december"],
  en: ["January", "February", "March", "April", "May", "June",
       "July", "August", "September", "October", "November", "December"],
  de: ["Januar", "Februar", "M\u00E4rz", "April", "Mai", "Juni",
       "Juli", "August", "September", "Oktober", "November", "Dezember"],
  fr: ["janvier", "f\u00E9vrier", "mars", "avril", "mai", "juin",
       "juillet", "ao\u00FBt", "septembre", "octobre", "novembre", "d\u00E9cembre"],
  es: ["enero", "febrero", "marzo", "abril", "mayo", "junio",
       "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"],
  ja: ["1\u6708", "2\u6708", "3\u6708", "4\u6708", "5\u6708", "6\u6708",
       "7\u6708", "8\u6708", "9\u6708", "10\u6708", "11\u6708", "12\u6708"],
};

// ---------------------------------------------------------------------------
// NUMBERS
// ---------------------------------------------------------------------------

export function formatNumber(
  value: number,
  ctx: LocaleContext,
  decimals?: number,
): string {
  const { decimal_separator, thousands_separator } = ctx.profile;
  const dec = decimals ?? 2;

  const fixed = Math.abs(value).toFixed(dec);
  const [intPart, fracPart] = fixed.split(".");

  // Insert thousands separator
  const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousands_separator);

  let result = fracPart !== undefined && dec > 0
    ? `${withThousands}${decimal_separator}${fracPart}`
    : withThousands;

  if (value < 0) result = `-${result}`;
  return result;
}

export function parseNumber(input: string, ctx: LocaleContext): number {
  const { decimal_separator, thousands_separator } = ctx.profile;

  let cleaned = input.trim();

  // Remove thousands separators
  if (thousands_separator) {
    cleaned = cleaned.split(thousands_separator).join("");
  }

  // Normalise decimal separator to '.'
  if (decimal_separator !== ".") {
    cleaned = cleaned.replace(decimal_separator, ".");
  }

  // Strip any remaining non-numeric chars except minus and dot
  cleaned = cleaned.replace(/[^\d.\-]/g, "");

  const num = parseFloat(cleaned);
  if (isNaN(num)) throw new Error(`Cannot parse number from "${input}"`);
  return num;
}

// ---------------------------------------------------------------------------
// CURRENCY
// ---------------------------------------------------------------------------

export function formatCurrency(
  amount: number,
  currency: string,
  ctx: LocaleContext,
): string {
  const upper = currency.toUpperCase();
  const isZeroDecimal = ZERO_DECIMAL_CURRENCIES.includes(upper);
  const decimals = isZeroDecimal ? 0 : 2;

  const rounded = isZeroDecimal ? Math.round(amount) : amount;
  const formatted = formatNumber(rounded, ctx, decimals);

  const symbol = CURRENCY_SYMBOLS[upper] || upper;
  const { currency_symbol_before, currency_symbol_space } = ctx.profile;
  const spacer = currency_symbol_space ? " " : "";

  if (currency_symbol_before) {
    return `${symbol}${spacer}${formatted}`;
  }
  return `${formatted}${spacer}${symbol}`;
}

// ---------------------------------------------------------------------------
// DATES
// ---------------------------------------------------------------------------

function toDate(date: string | Date): Date {
  return typeof date === "string" ? new Date(date) : date;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export function formatDate(
  date: string | Date,
  ctx: LocaleContext,
  format?: "short" | "long" | "default",
): string {
  const d = toDate(date);
  const day = d.getDate();
  const month = d.getMonth(); // 0-based
  const year = d.getFullYear();
  const fmt = format ?? "default";
  const lang = ctx.language;

  if (fmt === "long") {
    const monthName = (MONTH_NAMES[lang] ?? MONTH_NAMES.en)[month];

    if (lang === "ja") {
      return `${year}\u5E74${pad2(month + 1)}\u6708${pad2(day)}\u65E5`;
    }
    if (lang === "en") {
      return `${monthName} ${day}, ${year}`;
    }
    if (lang === "de") {
      return `${day}. ${monthName} ${year}`;
    }
    // sv, fr, es and others: "18 mars 2026"
    return `${day} ${monthName} ${year}`;
  }

  // short / default — use date_format pattern from profile
  const pattern = ctx.profile.date_format || "YYYY-MM-DD";

  if (lang === "ja" && fmt === "short") {
    return `${year}\u5E74${pad2(month + 1)}\u6708${pad2(day)}\u65E5`;
  }

  return pattern
    .replace("YYYY", `${year}`)
    .replace("MM", pad2(month + 1))
    .replace("DD", pad2(day));
}

export function formatTime(date: string | Date, ctx: LocaleContext): string {
  const d = toDate(date);
  const hours = d.getHours();
  const minutes = pad2(d.getMinutes());

  if (ctx.profile.time_format === "H12") {
    const period = hours >= 12 ? "PM" : "AM";
    const h12 = hours % 12 || 12;
    return `${h12}:${minutes} ${period}`;
  }
  return `${hours}:${minutes}`;
}

export function formatDateTime(date: string | Date, ctx: LocaleContext): string {
  return `${formatDate(date, ctx)} ${formatTime(date, ctx)}`;
}

// ---------------------------------------------------------------------------
// UNITS
// ---------------------------------------------------------------------------

export function formatDistance(meters: number, ctx: LocaleContext): string {
  if (ctx.profile.measurement_system === "IMPERIAL") {
    const feet = meters * 3.28084;
    if (feet >= 5280) {
      const miles = meters / 1609.344;
      return `${formatNumber(miles, ctx, 1)} mi`;
    }
    return `${formatNumber(Math.round(feet), ctx, 0)} ft`;
  }
  // METRIC
  if (meters >= 1000) {
    const km = meters / 1000;
    return `${formatNumber(km, ctx, 1)} km`;
  }
  return `${formatNumber(Math.round(meters), ctx, 0)} m`;
}

export function formatArea(sqMeters: number, ctx: LocaleContext): string {
  if (ctx.profile.measurement_system === "IMPERIAL") {
    const sqFeet = sqMeters * 10.7639;
    if (sqFeet >= 43560) {
      const acres = sqFeet / 43560;
      return `${formatNumber(acres, ctx, 2)} ac`;
    }
    return `${formatNumber(Math.round(sqFeet), ctx, 0)} sq ft`;
  }
  // METRIC
  if (sqMeters >= 10000) {
    const hectares = sqMeters / 10000;
    return `${formatNumber(hectares, ctx, 2)} ha`;
  }
  return `${formatNumber(Math.round(sqMeters), ctx, 0)} m\u00B2`;
}

export function formatWeight(grams: number, ctx: LocaleContext): string {
  if (ctx.profile.measurement_system === "IMPERIAL") {
    const ounces = grams / 28.3495;
    if (ounces >= 16) {
      const pounds = ounces / 16;
      return `${formatNumber(pounds, ctx, 1)} lb`;
    }
    return `${formatNumber(Math.round(ounces * 10) / 10, ctx, 1)} oz`;
  }
  // METRIC
  if (grams >= 1000) {
    const kg = grams / 1000;
    return `${formatNumber(kg, ctx, 1)} kg`;
  }
  return `${formatNumber(Math.round(grams), ctx, 0)} g`;
}

export function formatTemperature(celsius: number, ctx: LocaleContext): string {
  if (ctx.profile.temperature_unit === "FAHRENHEIT") {
    const f = celsius * 9 / 5 + 32;
    return `${Math.round(f)}\u00B0F`;
  }
  return `${Math.round(celsius)}\u00B0C`;
}

// ---------------------------------------------------------------------------
// PERCENT
// ---------------------------------------------------------------------------

export function formatPercent(
  value: number,
  ctx: LocaleContext,
  decimals?: number,
): string {
  const formatted = formatNumber(value, ctx, decimals ?? 1);
  const spacer = ctx.profile.percent_space ? " " : "";
  return `${formatted}${spacer}%`;
}

// ---------------------------------------------------------------------------
// ADDRESS
// ---------------------------------------------------------------------------

export function formatAddress(
  address: Record<string, string>,
  ctx: LocaleContext,
): string {
  const template = ctx.profile.address_format || "{{street}}\n{{postal_code}} {{city}}\n{{country}}";

  return template.replace(/\{\{(\w+)\}\}/g, (_match, key) => {
    return address[key] || "";
  }).replace(/\n{2,}/g, "\n").trim();
}

// ---------------------------------------------------------------------------
// NAME
// ---------------------------------------------------------------------------

export function formatName(
  given: string,
  family: string,
  ctx: LocaleContext,
): string {
  if (ctx.profile.name_order === "FAMILY_GIVEN") {
    return `${family} ${given}`.trim();
  }
  return `${given} ${family}`.trim();
}

// ---------------------------------------------------------------------------
// TAX / VAT
// ---------------------------------------------------------------------------

export function getVATRates(ctx: LocaleContext): Record<string, number> {
  return ctx.profile.vat_rates || {};
}

export function calculateVAT(
  amount: number,
  rate: string,
  ctx: LocaleContext,
): { net: number; vat: number; gross: number } {
  const rates = getVATRates(ctx);
  const pct = rates[rate];
  if (pct === undefined) {
    throw new Error(`Unknown VAT rate "${rate}" for locale ${ctx.locale}`);
  }
  const vatAmount = amount * (pct / 100);
  return {
    net: Math.round(amount * 100) / 100,
    vat: Math.round(vatAmount * 100) / 100,
    gross: Math.round((amount + vatAmount) * 100) / 100,
  };
}

export function formatVATLabel(ctx: LocaleContext, rate?: string): string {
  const label = ctx.profile.vat_label || "VAT";
  if (rate) {
    const rates = getVATRates(ctx);
    const pct = rates[rate];
    if (pct !== undefined) {
      return `${label} ${pct}%`;
    }
  }
  return label;
}

// ---------------------------------------------------------------------------
// TRANSLATION
// ---------------------------------------------------------------------------

const translationCache: Map<string, string> = new Map();

export async function t(
  key: string,
  ctx: LocaleContext,
  params?: Record<string, string>,
): Promise<string> {
  // 1. Check custom_translations for org (if org context available)
  const orgCacheKey = `org:${ctx.locale}:${key}`;
  const cached = translationCache.get(orgCacheKey);
  if (cached) {
    return applyParams(cached, params);
  }

  // Try org custom translations
  const { data: orgData } = await supabase
    .from("custom_translations")
    .select("value")
    .eq("translation_key", key)
    .eq("language_code", ctx.language)
    .maybeSingle();

  if (orgData?.value) {
    translationCache.set(orgCacheKey, orgData.value);
    return applyParams(orgData.value, params);
  }

  // 2. Check translations for language
  const langCacheKey = `lang:${ctx.language}:${key}`;
  const cachedLang = translationCache.get(langCacheKey);
  if (cachedLang) {
    return applyParams(cachedLang, params);
  }

  const { data: langData } = await supabase
    .from("translations")
    .select("value")
    .eq("key", key)
    .eq("language_code", ctx.language)
    .maybeSingle();

  if (langData?.value) {
    translationCache.set(langCacheKey, langData.value);
    return applyParams(langData.value, params);
  }

  // 3. Fallback to 'en'
  if (ctx.language !== "en") {
    const { data: enData } = await supabase
      .from("translations")
      .select("value")
      .eq("key", key)
      .eq("language_code", "en")
      .maybeSingle();

    if (enData?.value) {
      translationCache.set(langCacheKey, enData.value);
      return applyParams(enData.value, params);
    }
  }

  // 4. Fallback to key itself
  return applyParams(key, params);
}

function applyParams(
  template: string,
  params?: Record<string, string>,
): string {
  if (!params) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_match, k) => params[k] ?? `{{${k}}}`);
}

export async function tBatch(
  keys: string[],
  ctx: LocaleContext,
): Promise<Record<string, string>> {
  if (keys.length === 0) return {};

  // Fetch all matching translations for language in one query
  const { data: langRows } = await supabase
    .from("translations")
    .select("key, value")
    .in("key", keys)
    .eq("language_code", ctx.language);

  const result: Record<string, string> = {};
  const langMap = new Map<string, string>();
  for (const row of langRows ?? []) {
    langMap.set(row.key, row.value);
  }

  // Determine which keys still need fallback to 'en'
  const missingKeys = keys.filter((k) => !langMap.has(k));

  let enMap = new Map<string, string>();
  if (missingKeys.length > 0 && ctx.language !== "en") {
    const { data: enRows } = await supabase
      .from("translations")
      .select("key, value")
      .in("key", missingKeys)
      .eq("language_code", "en");

    for (const row of enRows ?? []) {
      enMap.set(row.key, row.value);
    }
  }

  // Check org custom overrides
  const { data: orgRows } = await supabase
    .from("custom_translations")
    .select("translation_key, value")
    .in("translation_key", keys)
    .eq("language_code", ctx.language);

  const orgMap = new Map<string, string>();
  for (const row of orgRows ?? []) {
    orgMap.set(row.translation_key, row.value);
  }

  // Build final result: org override > language > en fallback > key
  for (const key of keys) {
    result[key] = orgMap.get(key) ?? langMap.get(key) ?? enMap.get(key) ?? key;
  }

  return result;
}
