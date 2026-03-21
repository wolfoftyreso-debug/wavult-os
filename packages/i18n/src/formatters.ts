/**
 * Locale-aware formatters for dates, currencies, and numbers.
 * Uses native Intl APIs — no external deps.
 */

const localeToIntlMap: Record<string, string> = {
  sv: 'sv-SE',
  en: 'en-GB',
  de: 'de-DE',
  no: 'nb-NO',
  da: 'da-DK',
  fi: 'fi-FI',
};

export function localeToIntl(locale: string): string {
  return localeToIntlMap[locale] ?? 'sv-SE';
}

export function formatDate(
  date: Date | string | number,
  locale: string,
  options?: Intl.DateTimeFormatOptions,
): string {
  const defaultOpts: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  };
  return new Intl.DateTimeFormat(localeToIntl(locale), defaultOpts).format(
    new Date(date),
  );
}

export function formatDateLong(date: Date | string | number, locale: string): string {
  return formatDate(date, locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

export function formatDateShort(date: Date | string | number, locale: string): string {
  return formatDate(date, locale, { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export function formatDateTime(date: Date | string | number, locale: string): string {
  return new Intl.DateTimeFormat(localeToIntl(locale), {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function formatCurrency(
  amount: number,
  currency: string,
  locale: string,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(localeToIntl(locale), {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    ...options,
  }).format(amount);
}

export function formatNumber(
  num: number,
  locale: string,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(localeToIntl(locale), options).format(num);
}

export function formatPercent(num: number, locale: string, decimals = 1): string {
  return new Intl.NumberFormat(localeToIntl(locale), {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num / 100);
}
